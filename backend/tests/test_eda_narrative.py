"""
backend/tests/test_eda_narrative.py
Unit tests for the AI-generated EDA narrative service.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from app.services.eda_narrative import EDANarrativeService
from app.schemas.eda import DistributionProfile, CategoricalBreakdown, CorrelationPair


@pytest.fixture
def sample_inputs():
    distributions = [
        DistributionProfile(
            column="revenue", mean=100.0, median=90.0, std=20.0,
            skewness=1.2, kurtosis=0.5, min=10.0, max=500.0, bins=[]
        )
    ]
    categoricals = []
    top_pairs = [
        CorrelationPair(col1="revenue", col2="spend", correlation=0.85, strength="Strong Positive")
    ]
    return distributions, categoricals, top_pairs, 1000


@patch("app.services.eda_narrative.settings")
def test_generate_narrative_skips_if_no_api_key(mock_settings, sample_inputs):
    mock_settings.GEMINI_API_KEY = ""
    result = EDANarrativeService.generate_narrative(*sample_inputs)
    assert result is None


@patch("app.services.eda_narrative.settings")
@patch("app.services.eda_narrative.genai.Client")
def test_generate_narrative_success(mock_client_cls, mock_settings, sample_inputs):
    mock_settings.GEMINI_API_KEY = "dummy"
    mock_settings.GEMINI_MODEL = "gemini-2.5-flash"
    
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    
    # Mock LLM response
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "overview": "Data is clean and shows strong correlations.",
        "key_findings": ["Revenue and spend are strongly correlated."]
    })
    mock_client.models.generate_content.return_value = mock_response

    result = EDANarrativeService.generate_narrative(*sample_inputs)

    assert result is not None
    assert result.overview == "Data is clean and shows strong correlations."
    assert len(result.key_findings) == 1
    assert "Revenue" in result.key_findings[0]


@patch("app.services.eda_narrative.settings")
@patch("app.services.eda_narrative.genai.Client")
def test_generate_narrative_handles_exception(mock_client_cls, mock_settings, sample_inputs):
    mock_settings.GEMINI_API_KEY = "dummy"
    
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = Exception("API Error")

    result = EDANarrativeService.generate_narrative(*sample_inputs)
    assert result is None
