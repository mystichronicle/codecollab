"""Git operations service for repository management."""

import os
import re
import shutil
from typing import List, Dict, Optional
from pathlib import Path
import git
from git import Repo, GitCommandError
import logging

logger = logging.getLogger(__name__)

REPOS_BASE_PATH = Path("/tmp/codecollab_repos")
REPOS_BASE_PATH.mkdir(exist_ok=True)

# Regex pattern for valid session IDs (alphanumeric, hyphens, underscores only)
VALID_SESSION_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]+$')
# Maximum session ID length
MAX_SESSION_ID_LENGTH = 128
# Maximum file path length
MAX_FILE_PATH_LENGTH = 1024


def _validate_session_id(session_id: str) -> bool:
    """
    Validate session ID to prevent path traversal attacks.
    
    Args:
        session_id: The session ID to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not session_id:
        return False
    if len(session_id) > MAX_SESSION_ID_LENGTH:
        return False
    if not VALID_SESSION_ID_PATTERN.match(session_id):
        return False
    # Extra check for path traversal attempts
    if '..' in session_id or '/' in session_id or '\\' in session_id:
        return False
    return True


def _validate_file_path(file_path: str) -> bool:
    """
    Validate file path to prevent path traversal attacks.
    
    Args:
        file_path: The file path to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not file_path:
        return False
    if len(file_path) > MAX_FILE_PATH_LENGTH:
        return False
    # Check for null bytes (can be used to bypass checks)
    if '\x00' in file_path:
        return False
    # Normalize and check for traversal
    normalized = os.path.normpath(file_path)
    if normalized.startswith('..') or normalized.startswith('/') or normalized.startswith('\\'):
        return False
    # Check for absolute paths on Windows
    if len(normalized) > 1 and normalized[1] == ':':
        return False
    return True


def _safe_resolve_path(base_path: Path, relative_path: str) -> Optional[Path]:
    """
    Safely resolve a path within a base directory, preventing path traversal.
    
    Args:
        base_path: The base directory path
        relative_path: The relative path to resolve
        
    Returns:
        Resolved Path if safe, None if path traversal detected
    """
    try:
        # Resolve base path first
        base_resolved = base_path.resolve()
        # Join and resolve the full path
        full_path = (base_path / relative_path).resolve()
        # Check if the resolved path is within the base directory
        if not str(full_path).startswith(str(base_resolved) + os.sep) and full_path != base_resolved:
            return None
        return full_path
    except (ValueError, OSError):
        return None


class GitService:
    """Service for handling Git operations."""

    @staticmethod
    def _get_repo_path(session_id: str) -> Optional[Path]:
        """
        Get the path for a session's repository with validation.
        
        Args:
            session_id: The session identifier
            
        Returns:
            Path if valid, None if validation fails
        """
        if not _validate_session_id(session_id):
            return None
        return REPOS_BASE_PATH / session_id

    @staticmethod
    def configure_user(
        session_id: str,
        name: str,
        email: str,
        global_config: bool = False
    ) -> Dict[str, any]:
        """
        Configure Git user information.
        
        Args:
            session_id: Unique session identifier
            name: User's full name
            email: User's email address
            global_config: If True, configure globally; otherwise, per-repo
            
        Returns:
            Dict with configuration status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not global_config and not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            if global_config:
                # Configure globally
                import subprocess
                subprocess.run(["git", "config", "--global", "user.name", name], check=True)
                subprocess.run(["git", "config", "--global", "user.email", email], check=True)
                scope = "global"
            else:
                # Configure for this repo only
                repo = Repo(repo_path)
                with repo.config_writer() as git_config:
                    git_config.set_value("user", "name", name)
                    git_config.set_value("user", "email", email)
                scope = "repository"
            
            return {
                "success": True,
                "message": f"Git user configured ({scope})",
                "name": name,
                "email": email,
                "scope": scope
            }
        except Exception as e:
            logger.error(f"Error configuring Git user: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def configure_credentials(
        session_id: str,
        github_token: str,
        github_username: str
    ) -> Dict[str, any]:
        """
        Configure Git credentials for authenticated operations.
        Sets up credential helper to use provided GitHub token.
        
        Args:
            session_id: Unique session identifier
            github_token: GitHub Personal Access Token
            github_username: GitHub username
            
        Returns:
            Dict with configuration status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            # Update remote URL to include credentials
            if repo.remotes:
                remote = repo.remotes.origin
                old_url = remote.url
                
                # Parse the URL and add credentials
                if old_url.startswith('https://github.com/'):
                    # Replace with authenticated URL
                    repo_path_part = old_url.replace('https://github.com/', '')
                    new_url = f'https://{github_username}:{github_token}@github.com/{repo_path_part}'
                    remote.set_url(new_url)
                    
                    return {
                        "success": True,
                        "message": "Git credentials configured successfully",
                        "note": "You can now push and pull from private repositories"
                    }
                else:
                    return {
                        "success": False,
                        "error": "Only HTTPS GitHub URLs are supported for credential configuration",
                        "current_url": old_url
                    }
            else:
                return {
                    "success": False,
                    "error": "No remote repository configured"
                }
                
        except Exception as e:
            logger.error(f"Error configuring credentials: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def get_user_config(session_id: str) -> Dict[str, any]:
        """
        Get Git user configuration.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dict with user configuration
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            # Always try global config first
            import subprocess
            try:
                name = subprocess.run(
                    ["git", "config", "--global", "user.name"],
                    capture_output=True, text=True, check=True
                ).stdout.strip()
                email = subprocess.run(
                    ["git", "config", "--global", "user.email"],
                    capture_output=True, text=True, check=True
                ).stdout.strip()
                
                if name and email:
                    return {
                        "success": True,
                        "name": name,
                        "email": email,
                        "scope": "global"
                    }
            except subprocess.CalledProcessError:
                pass
            
            # If no global config and no repo exists, return not configured
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "Git user not configured",
                    "message": "No global Git config found. Please configure your Git user."
                }
            
            repo = Repo(repo_path)
            with repo.config_reader() as git_config:
                try:
                    name = git_config.get_value("user", "name")
                    email = git_config.get_value("user", "email")
                    return {
                        "success": True,
                        "name": name,
                        "email": email,
                        "scope": "repository"
                    }
                except Exception:
                    # Fall back to global config
                    import subprocess
                    try:
                        name = subprocess.run(
                            ["git", "config", "--global", "user.name"],
                            capture_output=True, text=True, check=True
                        ).stdout.strip()
                        email = subprocess.run(
                            ["git", "config", "--global", "user.email"],
                            capture_output=True, text=True, check=True
                        ).stdout.strip()
                        return {
                            "success": True,
                            "name": name,
                            "email": email,
                            "scope": "global"
                        }
                    except subprocess.CalledProcessError:
                        return {
                            "success": False,
                            "error": "Git user not configured"
                        }
        except Exception as e:
            logger.error(f"Error getting Git user config: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def list_workspaces() -> Dict[str, any]:
        """
        List all Git workspaces (cloned repositories).
        
        Returns:
            Dict with list of workspaces
        """
        try:
            workspaces = []
            
            if not REPOS_BASE_PATH.exists():
                return {
                    "success": True,
                    "workspaces": []
                }
            
            for workspace_dir in REPOS_BASE_PATH.iterdir():
                if workspace_dir.is_dir() and (workspace_dir / ".git").exists():
                    try:
                        repo = Repo(workspace_dir)
                        
                        # Get remote URL if available
                        remote_url = None
                        if repo.remotes:
                            remote_url = repo.remotes.origin.url
                        
                        # Get repository name from path or remote URL
                        repo_name = workspace_dir.name
                        if remote_url:
                            # Extract repo name from URL (e.g., "octocat/Hello-World" from github URL)
                            repo_name = remote_url.rstrip('/').split('/')[-1].replace('.git', '')
                        
                        workspaces.append({
                            "workspace_id": workspace_dir.name,
                            "name": repo_name,
                            "path": str(workspace_dir),
                            "branch": repo.active_branch.name,
                            "remote_url": remote_url,
                            "is_dirty": repo.is_dirty(),
                            "commit_count": len(list(repo.iter_commits(max_count=100)))
                        })
                    except Exception as e:
                        logger.warning(f"Error reading workspace {workspace_dir}: {e}")
                        continue
            
            return {
                "success": True,
                "workspaces": workspaces
            }
        except Exception as e:
            logger.error(f"Error listing workspaces: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def clone_repository(
        session_id: str, 
        repo_url: str, 
        branch: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Clone a Git repository for a session.
        
        Args:
            session_id: Unique session identifier
            repo_url: Git repository URL
            branch: Optional branch name to checkout
            
        Returns:
            Dict with status and repository info
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            # Remove existing repo if it exists
            if repo_path.exists():
                shutil.rmtree(repo_path)
            
            # Clone the repository
            logger.info(f"Cloning {repo_url} to {repo_path}")
            repo = Repo.clone_from(repo_url, repo_path, branch=branch)
            
            return {
                "success": True,
                "message": "Repository cloned successfully",
                "path": str(repo_path),
                "branch": repo.active_branch.name,
                "remote_url": repo_url
            }
        except GitCommandError as e:
            logger.error(f"Git clone error: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to clone repository"
            }
        except Exception as e:
            logger.error(f"Unexpected error during clone: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "An unexpected error occurred"
            }

    @staticmethod
    def get_status(session_id: str) -> Dict[str, any]:
        """
        Get Git status for a session's repository.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dict with repository status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            # Get modified, untracked, and staged files
            modified = [item.a_path for item in repo.index.diff(None)]
            untracked = repo.untracked_files
            staged = [item.a_path for item in repo.index.diff("HEAD")]
            
            return {
                "success": True,
                "branch": repo.active_branch.name,
                "modified": modified,
                "untracked": untracked,
                "staged": staged,
                "is_dirty": repo.is_dirty(),
                "commit_count": len(list(repo.iter_commits()))
            }
        except Exception as e:
            logger.error(f"Error getting git status: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def commit_changes(
        session_id: str, 
        message: str,
        author_name: str,
        author_email: str,
        files: Optional[List[str]] = None
    ) -> Dict[str, any]:
        """
        Commit changes to the repository.
        
        Args:
            session_id: Unique session identifier
            message: Commit message
            author_name: Author name
            author_email: Author email
            files: Optional list of specific files to commit (None = all)
            
        Returns:
            Dict with commit info
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            # Stage files - validate file paths if specific files provided
            if files:
                validated_files = []
                for f in files:
                    if _validate_file_path(f):
                        safe_path = _safe_resolve_path(repo_path, f)
                        if safe_path is not None:
                            validated_files.append(f)
                        else:
                            return {
                                "success": False,
                                "error": f"Invalid file path: {f}"
                            }
                    else:
                        return {
                            "success": False,
                            "error": f"Invalid file path: {f}"
                        }
                repo.index.add(validated_files)
            else:
                repo.git.add(A=True)  # Add all files
            
            # Create commit
            commit = repo.index.commit(
                message,
                author=git.Actor(author_name, author_email)
            )
            
            return {
                "success": True,
                "message": "Changes committed successfully",
                "commit_hash": commit.hexsha,
                "commit_message": message,
                "author": f"{author_name} <{author_email}>"
            }
        except Exception as e:
            logger.error(f"Error committing changes: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def push_changes(
        session_id: str,
        remote: str = "origin",
        branch: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Push changes to remote repository.
        
        Args:
            session_id: Unique session identifier
            remote: Remote name (default: origin)
            branch: Branch name (default: current branch)
            
        Returns:
            Dict with push status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            if branch is None:
                branch = repo.active_branch.name
            
            # Push to remote
            origin = repo.remote(name=remote)
            push_info = origin.push(branch)
            
            return {
                "success": True,
                "message": f"Pushed to {remote}/{branch}",
                "remote": remote,
                "branch": branch
            }
        except Exception as e:
            logger.error(f"Error pushing changes: {e}")
            error_str = str(e)
            
            # Provide helpful error messages for common authentication issues
            if "could not read Username" in error_str or "could not read Password" in error_str:
                return {
                    "success": False,
                    "error": "Authentication required",
                    "message": "Push failed: Git credentials not configured. For HTTPS URLs, you need to use a Personal Access Token (PAT). Consider using SSH URLs instead, or configure Git credentials."
                }
            elif "Authentication failed" in error_str or "403" in error_str:
                return {
                    "success": False,
                    "error": "Authentication failed",
                    "message": "Push failed: Invalid credentials or insufficient permissions. Please check your access token or SSH keys."
                }
            elif "Permission denied" in error_str:
                return {
                    "success": False,
                    "error": "Permission denied",
                    "message": "Push failed: You don't have permission to push to this repository. Check your repository access rights."
                }
            
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to push changes. Check credentials and remote access."
            }

    @staticmethod
    def pull_changes(
        session_id: str,
        remote: str = "origin",
        branch: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Pull changes from remote repository.
        
        Args:
            session_id: Unique session identifier
            remote: Remote name (default: origin)
            branch: Branch name (default: current branch)
            
        Returns:
            Dict with pull status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            if branch is None:
                branch = repo.active_branch.name
            
            # Pull from remote
            origin = repo.remote(name=remote)
            pull_info = origin.pull(branch)
            
            return {
                "success": True,
                "message": f"Pulled from {remote}/{branch}",
                "remote": remote,
                "branch": branch
            }
        except Exception as e:
            logger.error(f"Error pulling changes: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def list_branches(session_id: str) -> Dict[str, any]:
        """
        List all branches in the repository.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dict with branch list
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            branches = [branch.name for branch in repo.branches]
            current_branch = repo.active_branch.name
            
            return {
                "success": True,
                "branches": branches,
                "current_branch": current_branch
            }
        except Exception as e:
            logger.error(f"Error listing branches: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def create_branch(
        session_id: str,
        branch_name: str,
        checkout: bool = True
    ) -> Dict[str, any]:
        """
        Create a new branch.
        
        Args:
            session_id: Unique session identifier
            branch_name: Name for the new branch
            checkout: Whether to checkout the new branch
            
        Returns:
            Dict with branch creation status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            # Create new branch
            new_branch = repo.create_head(branch_name)
            
            if checkout:
                new_branch.checkout()
            
            return {
                "success": True,
                "message": f"Branch '{branch_name}' created successfully",
                "branch": branch_name,
                "checked_out": checkout
            }
        except Exception as e:
            logger.error(f"Error creating branch: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def checkout_branch(session_id: str, branch_name: str) -> Dict[str, any]:
        """
        Checkout an existing branch.
        
        Args:
            session_id: Unique session identifier
            branch_name: Branch name to checkout
            
        Returns:
            Dict with checkout status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            repo.git.checkout(branch_name)
            
            return {
                "success": True,
                "message": f"Switched to branch '{branch_name}'",
                "branch": branch_name
            }
        except Exception as e:
            logger.error(f"Error checking out branch: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def get_file_tree(session_id: str) -> Dict[str, any]:
        """
        Get the file tree of the repository.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dict with file tree structure
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            def build_tree(path: Path, prefix: str = "") -> List[Dict]:
                """Recursively build file tree."""
                items = []
                
                try:
                    for item in sorted(path.iterdir()):
                        # Skip .git directory
                        if item.name == ".git":
                            continue
                        
                        rel_path = str(item.relative_to(repo_path))
                        
                        if item.is_file():
                            items.append({
                                "name": item.name,
                                "path": rel_path,
                                "type": "file",
                                "size": item.stat().st_size
                            })
                        elif item.is_dir():
                            items.append({
                                "name": item.name,
                                "path": rel_path,
                                "type": "directory",
                                "children": build_tree(item, prefix + "  ")
                            })
                except PermissionError:
                    pass
                
                return items
            
            tree = build_tree(repo_path)
            
            return {
                "success": True,
                "tree": tree
            }
        except Exception as e:
            logger.error(f"Error building file tree: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def read_file(session_id: str, file_path: str) -> Dict[str, any]:
        """
        Read a file from the repository.
        
        Args:
            session_id: Unique session identifier
            file_path: Relative path to file in repository
            
        Returns:
            Dict with file content
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        # Validate file path
        if not _validate_file_path(file_path):
            return {
                "success": False,
                "error": "Invalid file path"
            }
        
        try:
            # Safely resolve path
            full_path = _safe_resolve_path(repo_path, file_path)
            
            if full_path is None:
                return {
                    "success": False,
                    "error": "Access denied: file outside repository"
                }
            
            if not full_path.exists():
                return {
                    "success": False,
                    "error": "File not found"
                }
            
            if not full_path.is_file():
                return {
                    "success": False,
                    "error": "Path is not a file"
                }
            
            # Read file content
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {
                "success": True,
                "content": content,
                "path": file_path
            }
        except UnicodeDecodeError:
            return {
                "success": False,
                "error": "File is not a text file"
            }
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def write_file(session_id: str, file_path: str, content: str) -> Dict[str, any]:
        """
        Write content to a file in the repository.
        
        Args:
            session_id: Unique session identifier
            file_path: Relative path to file in repository
            content: File content to write
            
        Returns:
            Dict with write status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        # Validate file path
        if not _validate_file_path(file_path):
            return {
                "success": False,
                "error": "Invalid file path"
            }
        
        try:
            # Safely resolve path
            full_path = _safe_resolve_path(repo_path, file_path)
            
            if full_path is None:
                return {
                    "success": False,
                    "error": "Access denied: file outside repository"
                }
            
            # Create parent directories if needed
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file content
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return {
                "success": True,
                "message": "File written successfully",
                "path": file_path
            }
        except Exception as e:
            logger.error(f"Error writing file: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def stash_changes(
        session_id: str,
        message: Optional[str] = None,
        include_untracked: bool = False
    ) -> Dict[str, any]:
        """
        Stash current changes.
        
        Args:
            session_id: Unique session identifier
            message: Optional stash message
            include_untracked: Whether to include untracked files
            
        Returns:
            Dict with stash status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            args = []
            if include_untracked:
                args.append("-u")
            if message:
                args.extend(["save", message])
            
            repo.git.stash(*args)
            
            return {
                "success": True,
                "message": "Changes stashed successfully"
            }
        except Exception as e:
            logger.error(f"Error stashing changes: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def list_stashes(session_id: str) -> Dict[str, any]:
        """
        List all stashes.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dict with stash list
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            stash_list = repo.git.stash("list").split("\n") if repo.git.stash("list") else []
            
            stashes = []
            for stash in stash_list:
                if stash:
                    stashes.append(stash)
            
            return {
                "success": True,
                "stashes": stashes
            }
        except Exception as e:
            logger.error(f"Error listing stashes: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def apply_stash(session_id: str, stash_index: int = 0) -> Dict[str, any]:
        """
        Apply a stash.
        
        Args:
            session_id: Unique session identifier
            stash_index: Index of stash to apply (default: 0 = most recent)
            
        Returns:
            Dict with apply status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            repo.git.stash("apply", f"stash@{{{stash_index}}}")
            
            return {
                "success": True,
                "message": f"Stash {stash_index} applied successfully"
            }
        except Exception as e:
            logger.error(f"Error applying stash: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def pop_stash(session_id: str, stash_index: int = 0) -> Dict[str, any]:
        """
        Pop (apply and remove) a stash.
        
        Args:
            session_id: Unique session identifier
            stash_index: Index of stash to pop (default: 0 = most recent)
            
        Returns:
            Dict with pop status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            repo.git.stash("pop", f"stash@{{{stash_index}}}")
            
            return {
                "success": True,
                "message": f"Stash {stash_index} popped successfully"
            }
        except Exception as e:
            logger.error(f"Error popping stash: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def get_commit_log(
        session_id: str,
        max_count: int = 50,
        branch: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Get commit history.
        
        Args:
            session_id: Unique session identifier
            max_count: Maximum number of commits to retrieve
            branch: Optional branch name (default: current branch)
            
        Returns:
            Dict with commit history
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            commits = []
            for commit in repo.iter_commits(branch, max_count=max_count):
                commits.append({
                    "hash": commit.hexsha,
                    "short_hash": commit.hexsha[:7],
                    "author": str(commit.author),
                    "email": commit.author.email,
                    "message": commit.message.strip(),
                    "date": commit.committed_datetime.isoformat(),
                    "parent_count": len(commit.parents)
                })
            
            return {
                "success": True,
                "commits": commits,
                "count": len(commits)
            }
        except Exception as e:
            logger.error(f"Error getting commit log: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def get_diff(
        session_id: str,
        commit1: Optional[str] = None,
        commit2: Optional[str] = None,
        file_path: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Get diff between commits or working directory.
        
        Args:
            session_id: Unique session identifier
            commit1: First commit (default: HEAD)
            commit2: Second commit (default: working directory)
            file_path: Optional specific file path
            
        Returns:
            Dict with diff content
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        # Validate file path if provided
        if file_path and not _validate_file_path(file_path):
            return {
                "success": False,
                "error": "Invalid file path"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            args = []
            if commit1:
                args.append(commit1)
            if commit2:
                args.append(commit2)
            if file_path:
                args.extend(["--", file_path])
            
            diff_text = repo.git.diff(*args) if args else repo.git.diff()
            
            return {
                "success": True,
                "diff": diff_text
            }
        except Exception as e:
            logger.error(f"Error getting diff: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def merge_branch(
        session_id: str,
        branch_name: str,
        commit_message: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Merge a branch into the current branch.
        
        Args:
            session_id: Unique session identifier
            branch_name: Branch to merge
            commit_message: Optional merge commit message
            
        Returns:
            Dict with merge status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            current_branch = repo.active_branch.name
            
            # Perform merge
            args = [branch_name]
            if commit_message:
                args.extend(["-m", commit_message])
            
            repo.git.merge(*args)
            
            return {
                "success": True,
                "message": f"Merged '{branch_name}' into '{current_branch}'",
                "current_branch": current_branch,
                "merged_branch": branch_name
            }
        except GitCommandError as e:
            logger.error(f"Merge conflict or error: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Merge conflict detected. Please resolve conflicts manually."
            }
        except Exception as e:
            logger.error(f"Error merging branch: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def reset(
        session_id: str,
        mode: str = "mixed",
        commit: str = "HEAD"
    ) -> Dict[str, any]:
        """
        Reset current branch to a specific state.
        
        Args:
            session_id: Unique session identifier
            mode: Reset mode (soft, mixed, hard)
            commit: Commit to reset to (default: HEAD)
            
        Returns:
            Dict with reset status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            if mode not in ["soft", "mixed", "hard"]:
                return {
                    "success": False,
                    "error": "Invalid reset mode. Use 'soft', 'mixed', or 'hard'"
                }
            
            repo = Repo(repo_path)
            repo.git.reset(f"--{mode}", commit)
            
            return {
                "success": True,
                "message": f"Reset to {commit} ({mode} mode)",
                "mode": mode,
                "commit": commit
            }
        except Exception as e:
            logger.error(f"Error resetting: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def create_tag(
        session_id: str,
        tag_name: str,
        message: Optional[str] = None,
        commit: str = "HEAD"
    ) -> Dict[str, any]:
        """
        Create a new tag.
        
        Args:
            session_id: Unique session identifier
            tag_name: Name for the tag
            message: Optional tag message (creates annotated tag)
            commit: Commit to tag (default: HEAD)
            
        Returns:
            Dict with tag creation status
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            if message:
                # Annotated tag
                repo.create_tag(tag_name, ref=commit, message=message)
            else:
                # Lightweight tag
                repo.create_tag(tag_name, ref=commit)
            
            return {
                "success": True,
                "message": f"Tag '{tag_name}' created successfully",
                "tag": tag_name,
                "commit": commit
            }
        except Exception as e:
            logger.error(f"Error creating tag: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def list_tags(session_id: str) -> Dict[str, any]:
        """
        List all tags.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dict with tag list
        """
        repo_path = GitService._get_repo_path(session_id)
        
        if repo_path is None:
            return {
                "success": False,
                "error": "Invalid session ID"
            }
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            tags = [tag.name for tag in repo.tags]
            
            return {
                "success": True,
                "tags": tags,
                "count": len(tags)
            }
        except Exception as e:
            logger.error(f"Error listing tags: {e}")
            return {
                "success": False,
                "error": str(e)
            }
