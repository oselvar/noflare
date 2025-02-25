# Noflare

Noflare is a a drop-in replacement for selected Cloudflare Workers features
that makes it easier to test Cloudflare Worker applications.

Noflare does not use a local wrangler session and does not depend on the Cloudflare runtime.

## Workflows

Just write your workflows as normal with the following changes:

1. Replace the import of `cloudflare:workers` with `@oselvar/noflare`
2. Replace the use of `this.env` with `this.adapters` - see
3. Use `createCloudflareWorkflow` to convert your Noflare Workflow to a Cloudflare Workflow

See [CalculateCubeWorkflow.ts](./src/examples/CalculateCubeWorkflow.ts) for an example.

Try it out interactively

    # Terminal 1
    npm start

    # Terminal 2
    curl http://localhost:9875?value=3

    ## Replace id with the response from the first request
    curl http://localhost:9875?instanceId=id

Now, let's test it:

    npx vitest

## Services

Just write your services as normal with the following changes:

1. Replace the import of 'cloudflare:workers' with 'noflare:services'
2. Replace the use of 'this.env' with 'this.adapters'

## Adapters

Noflare requires your application to decouple the business logic from the Cloudflare Workers runtime
by using _adapters_.

For example, if your application needs to store PDFs in a KV store, your business logic will access
a `PDFStore` adapter, not the `this.env.PDF_STORE` object.

An adapter is an interface that defines the methods your business logic will use.

```typescript
interface PDFStore {
  storePDF(id: string, pdf: PDF): Promise<void>;
  getPDF(id: string): Promise<PDF>;
}
```

You will have two implementations of the `PDFStore` interface:

1. A production implementation that uses a `KVNamespace` instance
2. A stub implementation (used for testing) that uses a `Map` instance
