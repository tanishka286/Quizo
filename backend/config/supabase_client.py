import os

from dotenv import load_dotenv
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

load_dotenv()

_url = os.environ.get("SUPABASE_URL")
_key = os.environ.get("SUPABASE_KEY")

if not _url or not _key:
    raise ValueError(
        "SUPABASE_URL and SUPABASE_KEY must be set in the environment (e.g. in .env)"
    )

supabase: Client = create_client(_url, _key)


def make_supabase_client(access_token: str | None = None) -> Client:
    """Create a new client instance, optionally bound to a user JWT."""
    if access_token:
        options = SyncClientOptions(headers={"Authorization": f"Bearer {access_token}"})
        return create_client(_url, _key, options=options)
    return create_client(_url, _key)
