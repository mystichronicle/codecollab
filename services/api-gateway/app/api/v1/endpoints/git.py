"""Git operations endpoints."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.services.git_service import GitService
from app.api.v1.auth import get_current_user

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
    current_user = Depends(get_current_user)
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
        author_name=current_user.get("username", "Unknown"),
        author_email=current_user.get("email", "unknown@example.com"),
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
