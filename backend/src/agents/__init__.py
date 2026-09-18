"""Load agent modules from ownership folders (including hyphenated names)."""

from __future__ import annotations

import sys
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import ModuleType

_AGENTS_DIR = Path(__file__).resolve().parent


def _load(folder: str, module_name: str) -> ModuleType:
    path = _AGENTS_DIR / folder / "agent.py"
    if not path.exists():
        raise FileNotFoundError(f"Missing agent module: {path}")
    spec = spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load agent from {path}")
    mod = module_from_spec(spec)
    # Register before exec so Pydantic/dataclasses can resolve cls.__module__
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod


curriculum = _load("curriculum", "agents_curriculum")
tutor = _load("tutor", "agents_tutor")
evaluation = _load("evaluation", "agents_evaluation")
learning_manager = _load("learning-manager", "agents_learning_manager")
