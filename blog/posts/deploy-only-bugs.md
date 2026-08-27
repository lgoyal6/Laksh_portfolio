---
title: The bugs that only exist after you deploy
date: 2026-08-26
summary: My gateway had a full test suite, a green CI matrix, and a one-click deploy button in the README. The button did not work. Here are the six things that were broken, none of which a test could have caught.
tags: infrastructure, go, deployment
---

I built [tollgate](https://github.com/lgoyal6/tollgate) so a team can share one LLM
provider key safely. Everyone gets a personal revocable key with its own rate budget,
and the real credential is injected server side where nobody sees it. It has a test
suite, a CI matrix, load tests at 2,000 requests a second, and a Deploy button in the
README.

Then I actually pressed the button, and nothing worked.

What follows is every bug I found in the two hours after that. Not one of them is a
logic error. Every one of them lives in the gap between a repository that builds and a
repository that runs somewhere other than my laptop, which is a gap no unit test is
looking at.

## 1. The browser could not talk to it at all

The gateway answered `curl` perfectly and answered a browser with nothing. No CORS
headers, so the preflight failed and the real request never left the tab.

The fix is one middleware, but where you put it decides whether it works. A preflight
`OPTIONS` request carries no `Authorization` header, by design, because the browser
sends it before it will show your code the response. So if CORS sits inside the auth
middleware, auth rejects the preflight and the browser never gets permission to send
the request that would have carried the credential. It has to sit inside the panic
recovery and outside auth:

```go
r.Use(middleware.Recover)
r.Use(middleware.CORS(cfg.AllowedOrigins))  // must answer unauthenticated
r.Use(middleware.Auth(store))
```

Ordering bugs in middleware chains are invisible in tests that call handlers directly.
Mine did.

## 2. Managed Redis hands you a URL, not a host and a port

My config wanted `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`. Every managed Redis on
every platform gives you one `REDIS_URL` with the credentials embedded, and expects you
to parse it. This is such a well-established convention that I had simply never noticed
it, because on my laptop Redis is on localhost with no password.

Accepting the URL and falling back to the discrete fields took ten minutes. Not knowing
the convention existed cost more than that.

## 3. The database had no schema

The deploy created a Postgres instance, the gateway connected to it, and every query
failed because no table existed. My migrations ran through a separate command I had
always invoked by hand.

The obvious fix is "run the migrate command as a release step", and that is where the
second problem showed up: the image is distroless. There is no shell in it to run a
command in. That is the correct choice for a production container and it means the
schema has to arrive some other way.

So the migrations are embedded in the binary and applied on boot behind a flag:

```go
//go:embed migrations/*.sql
var migrations embed.FS
```

Each migration runs in its own transaction, so a failure halfway leaves the ones before
it committed and the schema in a state you can reason about. `AUTO_MIGRATE` is off by
default and on in the deploy templates, because a platform with no shell needs it and a
Kubernetes cluster with a proper job step does not.

## 4. The platform deployed the wrong half of my application

My Dockerfile is multi-stage: a builder, then a `gateway` stage, then a `demo-upstream`
stage for the echo service the tests proxy to. I build the one I want with
`--target gateway`.

Platforms as a rule build the **last** stage in the file, and give you no way to pick a
different one. So the button deployed the demo echo service and called it my gateway.

Reordering so the gateway is last fixed that, and immediately created the next problem:
the gateway is only half of a deployment. Every route needs something to proxy to, and
now there was no way to deploy the upstream at all. It needed its own Dockerfile whose
default stage is the upstream, which feels redundant until you accept that "the default
stage" is an interface the platform reads, not an implementation detail.

## 5. Exiting on the first connection error is a crash loop

The gateway connected to Postgres and Redis on boot and exited if either failed. That is
reasonable-looking code and it is wrong on every platform I care about.

Kubernetes starts containers in no particular order. A restarted Postgres takes a moment
before it accepts connections. And a platform that sleeps idle services wakes them on the
first connection attempt, which means the first attempt is *guaranteed* to fail. Exiting
on the first error turned all three of those normal situations into a container that died
and restarted forever, with a log line that said only `connection refused`.

Both dependencies now back off up to a ninety second budget and log every attempt. A slow
dependency reads as a slow boot rather than as a service that keeps dying for no stated
reason.

## 6. The demo could not demonstrate the thing it existed to demonstrate

This one is not a deploy bug. It is worse, and I only saw it because deploying made it
obvious.

The project's page ran the real limiter compiled to WebAssembly on a virtual clock. Real
code, real algorithm, running in your tab. And it could not possibly show the one property
the product exists for, because a bucket living in your browser is not a bucket anyone
else can spend from. Nothing another visitor did could change what you saw. I had built a
convincing demonstration of the wrong claim.

The page now calls the deployed gateway. Twelve tokens, refilling at one a second, one
bucket shared by everyone with the page open. If a token vanishes while you sit still,
that was somebody else. The 429 is the gateway's real answer with its real `Retry-After`.
The key is scoped to a tenant whose only route points at an echo service, so the worst
anyone can do is drain a bucket that refills.

## What I took from it

The tests were fine. They tested the code, and the code was right. Every one of these
bugs lived in the boundary: the shape of a config value, which stage a builder picks,
whether a dependency is allowed to be slow, what a browser sends before it sends the real
request.

The only way I found them was to press the button myself and watch it fail. If your
README has a deploy button you have never pressed, it is not a deploy button. It is a
claim.
