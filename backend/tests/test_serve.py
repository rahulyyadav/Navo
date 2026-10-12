import pytest
from app.serve import port

def test_container_uses_host_assigned_port(monkeypatch):
    monkeypatch.delenv('PORT', raising=False)
    assert port() == 8000
    monkeypatch.setenv('PORT', '10000')
    assert port() == 10000
    for value in ['0', '65536', 'bad']:
        monkeypatch.setenv('PORT', value)
        with pytest.raises(ValueError): port()
