"""Git operations service for repository management."""

import os
import shutil
from typing import List, Dict, Optional
from pathlib import Path
import git
from git import Repo, GitCommandError
import logging

logger = logging.getLogger(__name__)

REPOS_BASE_PATH = Path("/tmp/codecollab_repos")
REPOS_BASE_PATH.mkdir(exist_ok=True)


class GitService:
    """Service for handling Git operations."""

    @staticmethod
    def _get_repo_path(session_id: str) -> Path:
        """Get the path for a session's repository."""
        return REPOS_BASE_PATH / session_id

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
        
        try:
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": "No repository found for this session"
                }
            
            repo = Repo(repo_path)
            
            # Stage files
            if files:
                repo.index.add(files)
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
        full_path = repo_path / file_path
        
        try:
            # Security check: ensure file is within repo
            full_path = full_path.resolve()
            if not str(full_path).startswith(str(repo_path.resolve())):
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
        full_path = repo_path / file_path
        
        try:
            # Security check: ensure file is within repo
            full_path = full_path.resolve()
            if not str(full_path).startswith(str(repo_path.resolve())):
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
