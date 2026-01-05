# beano

The simplest possible logger that I always copy/paste in between projects.

## Getting Started

```shell
<npm|yarn|pnpm|bun> install @michaelhelvey/beano
```

## Usage

```typescript
import { getLogger } from "@michaelhelvey/beano";

const log = getLogger("xyz");
log("it does stuff", "because", "yay");
```
