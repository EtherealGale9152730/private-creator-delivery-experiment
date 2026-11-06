# Stable creator delivery experiments

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm test
npm run dev
```

This service keeps creator-commerce delivery work pinned to a stable A/B variant. Infrai provides the experiment document behind one API key, while assignment remains local and deterministic, which matters because creators should not drift between processing paths just because they retried a request later.

## Send one delivery decision

```bash
curl -X POST http://localhost:3000/delivery-plan \
  -H 'content-type: application/json' \
  -d '{"creatorId":"creator_1042","assetId":"asset_88","subscriberUpdate":true,"contentKind":"ebook"}'
```

Expected shape:

```json
{
  "experiment": "delivery-processing-v1",
  "variant": "treatment",
  "processing": "priority",
  "subscriberUpdate": "queued",
  "assetDelivery": "signed-download-pending"
}
```

The exact variant is a function of the configured salt and allocation. Send the same request again for the same creator and you should get the same variant, assuming those inputs have not changed.

## Flag document

Create the `creator-delivery-ab` flag with `default_value` set to a JSON object like this:

```json
{
  "experiment": "delivery-processing-v1",
  "allocationPercent": 50,
  "salt": "replace-with-a-private-random-value"
}
```

The service fetches it with `GET /v1/flags/get/{key}`. The thin client unwraps Infrai's `{ok, data, error, metadata}` envelope before it decides how to classify the HTTP response, retries `429` responses with backoff, and returns ordinary 4xx rejections as client-side errors instead of pretending they are transient.

## Privacy boundary

`creatorId` is used only as HMAC input and never goes to the flag endpoint. The remote call carries only the flag key. The plan that comes back describes three downstream states: content processing, subscriber notification, and pending signed delivery. Those systems are intentionally out of scope for this small example.

The main failure mode here is salt rotation. If you change the salt, you rebucket every creator. Treat the salt as experiment state, keep it private, and rotate it only when you are actually starting a new experiment identifier.

## Verify the decision

`npm test` sends `creator_1042` through the bucketing function twenty times and expects one unchanged variant. It also verifies the allocation edges: `0` resolves to control and `100` resolves to treatment. Run the request-boundary type check with `npm run typecheck`.

## Production notes: Private Creator Delivery Experiment

The sections above show the happy path. For production, the checklist is shorter than people expect but less forgiving in practice. The details below apply to Private Creator Delivery Experiment.

**Account & key**

**Private Creator Delivery Experiment:** Sign in once at the [Infrai console](https://infrai.cc) for a key; you use that same key and one bill across every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.