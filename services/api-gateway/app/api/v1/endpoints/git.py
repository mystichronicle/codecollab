"""Git operations endpoints."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.services.git_service import GitService
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/workspaces")
async def list_workspaces(
    current_user = Depends(get_current_user)
):
    """
    List all Git workspaces (repositories) for the current user.
    
    Returns:
        List of workspace information
    """
    result = GitService.list_workspaces()
    return result


class CloneRequest(BaseModel):
    """Request model for cloning a repository."""
    repo_url: str = Field(..., description="Git repository URL")
    branch: Optional[str] = Field(None, description="Branch to checkout")


class CommitRequest(BaseModel):
    """Request model for committing changes."""
    message: str = Field(..., description="Commit message")
    files: Optional[List[str]] = Field(None, description="Specific files to commit (None = all)")


class BranchRequest(BaseModel):
    """Request model for creating a branch."""
    branch_name: str = Field(..., description="Name for the new branch")
    checkout: bool = Field(True, description="Whether to checkout the new branch")


class CheckoutRequest(BaseModel):
    """Request model for checking out a branch."""
    branch_name: str = Field(..., description="Branch name to checkout")


class PushRequest(BaseModel):
    """Request model for pushing changes."""
    remote: str = Field("origin", description="Remote name")
    branch: Optional[str] = Field(None, description="Branch name")


class PullRequest(BaseModel):
    """Request model for pulling changes."""
    remote: str = Field("origin", description="Remote name")
    branch: Optional[str] = Field(None, description="Branch name")


class FileReadRequest(BaseModel):
    """Request model for reading a file."""
    file_path: str = Field(..., description="Relative path to file in repository")


class FileWriteRequest(BaseModel):
    """Request model for writing a file."""
    file_path: str = Field(..., description="Relative path to file in repository")
    content: str = Field(..., description="File content to write")


@router.post("/clone/{session_id}")
async def clone_repository(
    session_id: str,
    request: CloneRequest,
    current_user = Depends(get_current_user)
):
    """
    Clone a Git repository for a session.
    
    Args:
        session_id: Unique session identifier
        request: Clone request with repo URL and optional branch
        
    Returns:
        Repository info and status
    """
    result = GitService.clone_repository(
        session_id=session_id,
        repo_url=request.repo_url,
        branch=request.branch
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Clone failed"))
    
    return result


@router.get("/status/{session_id}")
async def get_status(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get Git status for a session's repository.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        Repository status including modified, untracked, and staged files
    """
    result = GitService.get_status(session_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Status check failed"))
    
    return result


@router.post("/commit/{session_id}")
async def commit_changes(
    session_id: str,
    request: CommitRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Commit changes to the repository.
    
    Args:
        session_id: Unique session identifier
        request: Commit request with message and optional files
        
    Returns:
        Commit info
    """
    result = GitService.commit_changes(
        session_id=session_id,
        message=request.message,
        author_name=current_user.username,
        author_email=current_user.email,
        files=request.files
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Commit failed"))
    
    return result


@router.post("/push/{session_id}")
async def push_changes(
    session_id: str,
    request: PushRequest,
    current_user = Depends(get_current_user)
):
    """
    Push changes to remote repository.
    
    Args:
        session_id: Unique session identifier
        request: Push request with remote and branch
        
    Returns:
        Push status
    """
    result = GitService.push_changes(
        session_id=session_id,
        remote=request.remote,
        branch=request.branch
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Push failed"))
    
    return result


@router.post("/pull/{session_id}")
async def pull_changes(
    session_id: str,
    request: PullRequest,
    current_user = Depends(get_current_user)
):
    """
    Pull changes from remote repository.
    
    Args:
        session_id: Unique session identifier
        request: Pull request with remote and branch
        
    Returns:
        Pull status
    """
    result = GitService.pull_changes(
        session_id=session_id,
        remote=request.remote,
        branch=request.branch
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Pull failed"))
    
    return result


@router.get("/branches/{session_id}")
async def list_branches(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """
    List all branches in the repository.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        List of branches and current branch
    """
    result = GitService.list_branches(session_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to list branches"))
    
    return result


@router.post("/branches/{session_id}")
async def create_branch(
    session_id: str,
    request: BranchRequest,
    current_user = Depends(get_current_user)
):
    """
    Create a new branch.
    
    Args:
        session_id: Unique session identifier
        request: Branch request with name and checkout option
        
    Returns:
        Branch creation status
    """
    result = GitService.create_branch(
        session_id=session_id,
        branch_name=request.branch_name,
        checkout=request.checkout
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to create branch"))
    
    return result


@router.post("/checkout/{session_id}")
async def checkout_branch(
    session_id: str,
    request: CheckoutRequest,
    current_user = Depends(get_current_user)
):
    """
    Checkout an existing branch.
    
    Args:
        session_id: Unique session identifier
        request: Checkout request with branch name
        
    Returns:
        Checkout status
    """
    result = GitService.checkout_branch(
        session_id=session_id,
        branch_name=request.branch_name
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to checkout branch"))
    
    return result


@router.get("/tree/{session_id}")
async def get_file_tree(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get the file tree of the repository.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        File tree structure
    """
    result = GitService.get_file_tree(session_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to get file tree"))
    
    return result


@router.post("/files/read/{session_id}")
async def read_file(
    session_id: str,
    request: FileReadRequest,
    current_user = Depends(get_current_user)
):
    """
    Read a file from the repository.
    
    Args:
        session_id: Unique session identifier
        request: File read request with file path
        
    Returns:
        File content
    """
    result = GitService.read_file(
        session_id=session_id,
        file_path=request.file_path
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to read file"))
    
    return result


@router.post("/files/write/{session_id}")
async def write_file(
    session_id: str,
    request: FileWriteRequest,
    current_user = Depends(get_current_user)
):
    """
    Write content to a file in the repository.
    
    Args:
        session_id: Unique session identifier
        request: File write request with file path and content
        
    Returns:
        Write status
    """
    result = GitService.write_file(
        session_id=session_id,
        file_path=request.file_path,
        content=request.content
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to write file"))
    
    return result


# New Git operations


class GitUserConfigRequest(BaseModel):
    """Request model for configuring Git user."""
    name: str = Field(..., description="User's full name")
    email: str = Field(..., description="User's email address")
    global_config: bool = Field(False, description="Configure globally or per-repo")


class GitCredentialsRequest(BaseModel):
    """Request model for configuring Git credentials."""
    github_token: str = Field(..., description="GitHub Personal Access Token")
    github_username: str = Field(..., description="GitHub username")


class StashRequest(BaseModel):
    """Request model for stashing changes."""
    message: Optional[str] = Field(None, description="Stash message")
    include_untracked: bool = Field(False, description="Include untracked files")


class StashApplyRequest(BaseModel):
    """Request model for applying/popping stash."""
    stash_index: int = Field(0, description="Index of stash to apply/pop")


class CommitLogRequest(BaseModel):
    """Request model for getting commit log."""
    max_count: int = Field(50, description="Maximum number of commits")
    branch: Optional[str] = Field(None, description="Branch name")


class DiffRequest(BaseModel):
    """Request model for getting diff."""
    commit1: Optional[str] = Field(None, description="First commit")
    commit2: Optional[str] = Field(None, description="Second commit")
    file_path: Optional[str] = Field(None, description="Specific file path")


class MergeRequest(BaseModel):
    """Request model for merging branches."""
    branch_name: str = Field(..., description="Branch to merge")
    commit_message: Optional[str] = Field(None, description="Merge commit message")


class ResetRequest(BaseModel):
    """Request model for resetting."""
    mode: str = Field("mixed", description="Reset mode (soft, mixed, hard)")
    commit: str = Field("HEAD", description="Commit to reset to")


class TagRequest(BaseModel):
    """Request model for creating tags."""
    tag_name: str = Field(..., description="Tag name")
    message: Optional[str] = Field(None, description="Tag message (for annotated tags)")
    commit: str = Field("HEAD", description="Commit to tag")


@router.post("/config/user/{session_id}")
async def configure_git_user(
    session_id: str,
    request: GitUserConfigRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Configure Git user information.
    
    Args:
        session_id: Unique session identifier
        request: Git user configuration
        
    Returns:
        Configuration status
    """
    result = GitService.configure_user(
        session_id=session_id,
        name=request.name,
        email=request.email,
        global_config=request.global_config
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to configure user"))
    
    return result


@router.get("/config/user/{session_id}")
async def get_git_user_config(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get Git user configuration.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        User configuration (returns success=False if not configured)
    """
    result = GitService.get_user_config(session_id)
    
    # Don't raise exception if user not configured, just return the result
    # Frontend will handle the success=False case
    return result


@router.post("/config/credentials/{session_id}")
async def configure_git_credentials(
    session_id: str,
    request: GitCredentialsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Configure Git credentials for authenticated push/pull operations.
    
    Args:
        session_id: Unique session identifier
        request: Git credentials configuration
        
    Returns:
        Configuration status
    """
    result = GitService.configure_credentials(
        session_id=session_id,
        github_token=request.github_token,
        github_username=request.github_username
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to configure credentials"))
    
    return result


@router.post("/stash/{session_id}")
async def stash_changes(
    session_id: str,
    request: StashRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Stash current changes.
    
    Args:
        session_id: Unique session identifier
        request: Stash request
        
    Returns:
        Stash status
    """
    result = GitService.stash_changes(
        session_id=session_id,
        message=request.message,
        include_untracked=request.include_untracked
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to stash changes"))
    
    return result


@router.get("/stash/list/{session_id}")
async def list_stashes(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    List all stashes.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        List of stashes
    """
    result = GitService.list_stashes(session_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to list stashes"))
    
    return result


@router.post("/stash/apply/{session_id}")
async def apply_stash(
    session_id: str,
    request: StashApplyRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Apply a stash.
    
    Args:
        session_id: Unique session identifier
        request: Stash apply request
        
    Returns:
        Apply status
    """
    result = GitService.apply_stash(
        session_id=session_id,
        stash_index=request.stash_index
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to apply stash"))
    
    return result


@router.post("/stash/pop/{session_id}")
async def pop_stash(
    session_id: str,
    request: StashApplyRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Pop (apply and remove) a stash.
    
    Args:
        session_id: Unique session identifier
        request: Stash pop request
        
    Returns:
        Pop status
    """
    result = GitService.pop_stash(
        session_id=session_id,
        stash_index=request.stash_index
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to pop stash"))
    
    return result


@router.post("/log/{session_id}")
async def get_commit_log(
    session_id: str,
    request: CommitLogRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get commit history.
    
    Args:
        session_id: Unique session identifier
        request: Commit log request
        
    Returns:
        Commit history
    """
    result = GitService.get_commit_log(
        session_id=session_id,
        max_count=request.max_count,
        branch=request.branch
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to get commit log"))
    
    return result


@router.post("/diff/{session_id}")
async def get_diff(
    session_id: str,
    request: DiffRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get diff between commits or working directory.
    
    Args:
        session_id: Unique session identifier
        request: Diff request
        
    Returns:
        Diff content
    """
    result = GitService.get_diff(
        session_id=session_id,
        commit1=request.commit1,
        commit2=request.commit2,
        file_path=request.file_path
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to get diff"))
    
    return result


@router.post("/merge/{session_id}")
async def merge_branch(
    session_id: str,
    request: MergeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Merge a branch into the current branch.
    
    Args:
        session_id: Unique session identifier
        request: Merge request
        
    Returns:
        Merge status
    """
    result = GitService.merge_branch(
        session_id=session_id,
        branch_name=request.branch_name,
        commit_message=request.commit_message
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to merge branch"))
    
    return result


@router.post("/reset/{session_id}")
async def reset(
    session_id: str,
    request: ResetRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Reset current branch to a specific state.
    
    Args:
        session_id: Unique session identifier
        request: Reset request
        
    Returns:
        Reset status
    """
    result = GitService.reset(
        session_id=session_id,
        mode=request.mode,
        commit=request.commit
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to reset"))
    
    return result


@router.post("/tags/{session_id}")
async def create_tag(
    session_id: str,
    request: TagRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new tag.
    
    Args:
        session_id: Unique session identifier
        request: Tag request
        
    Returns:
        Tag creation status
    """
    result = GitService.create_tag(
        session_id=session_id,
        tag_name=request.tag_name,
        message=request.message,
        commit=request.commit
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to create tag"))
    
    return result


@router.get("/tags/list/{session_id}")
async def list_tags(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    List all tags.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        List of tags
    """
    result = GitService.list_tags(session_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to list tags"))
    
    return result
