import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models.user_model import User


def test_user_model_has_profile_fields():
    assert hasattr(User, "education")
    assert hasattr(User, "social_activities")
