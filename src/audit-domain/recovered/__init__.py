"""Independent recovered calculation kernels.

These functions are verified against synthetic observations. Client adapters
and complete legacy entrypoint migration are tracked separately in docs.
"""
from .kernels import REGISTRY
from .accounting import REGISTRY as ACCOUNTING_REGISTRY

REGISTRY.update(ACCOUNTING_REGISTRY)
from .matching import REGISTRY as MATCHING_REGISTRY
REGISTRY.update(MATCHING_REGISTRY)
from .date_rules import REGISTRY as DATE_REGISTRY
REGISTRY.update(DATE_REGISTRY)
from .workpapers import REGISTRY as WORKPAPER_REGISTRY
REGISTRY.update(WORKPAPER_REGISTRY)
from .relation_helpers import REGISTRY as RELATION_REGISTRY
from .bank_helpers import REGISTRY as BANK_REGISTRY
REGISTRY.update(RELATION_REGISTRY)
REGISTRY.update(BANK_REGISTRY)

__all__ = ['REGISTRY']
