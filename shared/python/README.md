# Shared Python helpers

## OpenAI (`openai_env.py`)

All services read the same environment variables:

| Variable | Required | Default |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes (for LLM features) | — |
| `OPENAI_MODEL` | No | `gpt-4o-mini` |
| `OPENAI_BASE_URL` | No | OpenAI default |

Import in any service:

```python
from openai_env import OPENAI_API_KEY, OPENAI_MODEL, is_openai_configured, openai_client_kwargs
```

Variable names are also listed in `env_constants.py`.
