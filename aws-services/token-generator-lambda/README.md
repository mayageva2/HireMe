# LiveKit Token Lambda

Mints a LiveKit JWT with **name** and **role** embedded (same as local dev), dispatches `my-agent`, and returns a unique room per interview.

## Deploy to existing Token Lambda (AWS Console)

1. Open **Lambda** → find the function behind  
   `https://iexzogfkyuunk7b5sunmodusay0whgku.lambda-url.us-east-1.on.aws/`
2. **Code** → replace handler code with `lambda_function.py` from this folder
3. **Deploy**
4. **Configuration** → **Environment variables**:
   - `LIVEKIT_URL` = `wss://hireme-khyjrqi7.livekit.cloud`
   - `LIVEKIT_API_KEY` = (from LiveKit Cloud)
   - `LIVEKIT_API_SECRET` = (from LiveKit Cloud)
5. **Configuration** → **Function URL** → CORS: allow `*` (or disable Function URL CORS if code sets headers)
6. Add Lambda layer or deploy package with `livekit-api` (see `requirements.txt`)

## Test

```bash
curl -X POST "https://iexzogfkyuunk7b5sunmodusay0whgku.lambda-url.us-east-1.on.aws/" \
  -H "Content-Type: application/json" \
  -d '{"name":"May","role":"Software Engineering"}'
```

Should return `{"token":"...","room":"interview-..."}`.
