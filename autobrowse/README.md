# AutoBrowse Submodule

This directory should contain the AutoBrowse automation engine as a git submodule.

To add the submodule (when AutoBrowse repo is created):

```bash
git submodule add https://github.com/keled-ai/autobrowse.git autobrowse
```

The runtime will import AutoBrowse from:
- `autobrowse/src/executor.ts` - CDP-based executor
- `autobrowse/package.json` - dependencies

Current status: AutoBrowse code exists in `autobrowse-service/` directory locally.