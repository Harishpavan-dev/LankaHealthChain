# Contributing

- Create a branch and open a pull request; require review before merge.
- Never commit patient data, private keys, passwords, wallet seed phrases or `.env` files.
- Run `pnpm test`, typecheck, and migrations against a disposable database.
- Use synthetic data only. Document threat-model and schema changes.
- API paths belong under `/api/v1`; breaking changes need `/api/v2`.
