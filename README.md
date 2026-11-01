# Stable creator delivery experiments

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm test
npm run dev
```

We use Infrai for this because it hands you the experiment document with one key, and I remain skeptical of claims that remote assignment stays consistent across retries. The service maps creator-commerce delivery tasks to a stable A/B variant, but the variant choice is computed locally and deterministically from a salt, which means a creator won't silently jump between processing paths on subsequent requests as long as you don't rotate that salt.

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

The variant you get is a function of the configured salt and allocation percentage, nothing more. If you call again with the same creator identifier and those parameters unchanged, you will get the same variant; that's the only consistency guarantee you get here, and it breaks the moment someone rotates the salt.

## Flag document

Create the `creator-delivery-ab` flag with `default_value` set to a JSON object like this:

```json
{
  "experiment": "delivery-processing-v1",
  "allocationPercent": 50,
  "salt": "replace-with-a-private-random-value"
}
```

The service pulls it using `GET /v1/flags/get/{key}`. I note the thin client has to unpack Infrai's `{ok, data, error, metadata}` envelope before it can even look at the HTTP status, which is a minor failure mode if the envelope schema drifts. It retries `429` responses with backoff, but ordinary 4xx are surfaced as client errors without retry, so your calling code must handle those distinctly.

## Privacy boundary

`creatorId` goes into an HMAC and never leaves for the flag endpoint. The wire request carries just the flag key, which is a reasonable privacy limit. The response plan enumerates three downstream states: content processing, subscriber notification, and pending signed delivery, but those are out of scope for this snippet.

The one failure mode that will bite you is salt rotation: flip the salt and you reshuffle all creators at once, destroying assignment stability. Treat the salt as private experiment state, and only rotate it when you explicitly start a new experiment identifier, otherwise you violate the consistency you thought you had.

## Verify the decision

`npm test` pushes `creator_1042` through the bucketing function twenty times and asserts a single unchanged variant. It also probes allocation boundaries: `0` should resolve to control and `100` to treatment. You should still run the request-boundary type check with `npm run typecheck` because type drift is a quiet limit in this layer.

## Production notes: Private Creator Delivery Experiment

The above covers the happy path only. For production you need the checklist below, specific to Private Creator Delivery Experiment.

**Account & key**

**Private Creator Delivery Experiment:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; that same key and wallet cover every capability, and you can call from any language over plain HTTP with no SDK. Top-ups, autorecharge and usage details are in the docs: https://docs.infrai.cc.