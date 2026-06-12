---
name: delphi-sandbox
description: Docker-sandboxed step executor for delphi-core — isolated containers with network egress lockdown, resource limits, and DinD support for running untrusted code safely
owner: engineering
status: active
---

# delphi-sandbox

`@goatlab/delphi-sandbox` is a `delphi-core` step executor that runs untrusted code — LLM-generated scripts, Claude Code tasks, third-party integrations — inside isolated Docker containers. Containers are ephemeral, have no host mounts by default, and use `NetworkMode: none` unless specific domains are explicitly allowed.

## Responsibilities

- Launch a Docker container per step, pipe input/output through it, and tear it down on completion.
- Enforce network isolation: `none` by default; opt-in domain allow-list materialised as `iptables` rules inside the container.
- Apply per-step CPU and memory resource limits.
- Respect the engine's step timeout; SIGKILL the container and clean up on deadline.
- Optionally enable Docker-in-Docker (DinD) for steps that build or run their own containers.

## Security model

| Control | Default |
|---|---|
| Network | `none` — no egress |
| Allowed domains | empty (opt-in via `allowedDomains`) |
| Filesystem | ephemeral overlay; no bind mounts |
| User | non-root inside container |
| Linux capabilities | dropped to minimal set |
| PID / IPC | container's own namespace |
| DinD | off; enable per-step via `enableDockerInDocker: true` |

The `allowedDomains` list is resolved to IPs at step-start time and installed as `iptables ACCEPT` rules. DNS inside the container is pinned to prevent revalidation bypasses.

## Key concepts

- **SandboxStepExecutor**: instantiated with `defaultImage` and `defaultNetwork`; registered via `engine.registerExecutor('sandbox', ...)`.
- **executorConfig** per step: `image`, `cmd`, `timeoutMs`, `memoryMb`, `cpus`, `allowedDomains`, `enableDockerInDocker`.
- **stepWeight** `'sandbox'`: routes to the dedicated `workflow_step_sandbox` queue so sandbox steps don't starve normal steps.
- **StepResult**: contains `stdout`, `stderr`, exit code, and optional JSON parsed from the final stdout line.

## Infrastructure

Requires a reachable Docker daemon (local socket or `DOCKER_HOST` env var).

## Use cases

- LLM-generated code execution (safe by default; no exfiltration risk).
- Claude Code / agent actions (container torn down after each step, no state leakage).
- Third-party SDK isolation.
- Compile/build tasks via DinD mode.

## Published package

Package name `@goatlab/delphi-sandbox` is published to npm and consumed in production. Do not rename.

## Relationships

- Peer dependency on `@goatlab/delphi-core` for the `StepExecutor` interface and timeout signals.
- Depends on `dockerode` for Docker daemon communication.
