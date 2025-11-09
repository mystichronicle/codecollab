"""Template endpoints for code snippets"""

from fastapi import APIRouter, HTTPException, status
from app.core.templates import get_template, list_templates
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/templates")
async def get_templates(language: str = None):
    """Get all templates or templates for a specific language"""
    templates = list_templates(language)
    
    if language and not templates.get(language):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No templates found for language: {language}"
        )
    
    return templates


@router.get("/templates/{language}/{template_id}")
async def get_template_by_id(language: str, template_id: str):
    """Get a specific template"""
    template = get_template(language, template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found for language '{language}'"
        )
    
    return {
        "language": language,
        "template_id": template_id,
        **template
    }
