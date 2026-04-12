# Deployment Checklist

Phase 26: Production Readiness Validation
Use this checklist before launching Tarneeb 400 to production.

## 1. Infrastructure 🌍
- [ ] MongoDB Atlas production cluster configured and IP whitelist set.
- [ ] Upstash Redis (or equivalent) production instance configured.
- [ ] Environment variables applied securely (using `.env.production.example` as a template).
- [ ] HTTPS / SSL certificates configured (e.g., via Let's Encrypt or Nginx reverse proxy).
- [ ] Automated backups enabled for MongoDB.
- [ ] Application monitoring tools (e.g., Prometheus) configured.

## 2. Code Quality 🕵️‍♂️
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run lint` passes with no warnings.
- [ ] All tests pass (`npm run test:integration`, `npm test`).
- [ ] No `console.log` statements left in hot paths (logger used instead).
- [ ] Docker image builds successfully and is pushed to registry.

## 3. Security 🛡️
- [ ] Run `npm audit` and resolve any critical vulnerabilities.
- [ ] Strong JWT secret generated (`openssl rand -base64 48`).
- [ ] CORS explicitly whitelisted to the production frontend domain (no `*`).
- [ ] Rate limits configured appropriately.
- [ ] Helmet / Security Headers are active (HSTS, CSP, etc).

## 4. Operational Readiness ⚙️
- [ ] `/api/health` endpoint correctly reports MongoDB and Redis status.
- [ ] `metrics` endpoint correctly exports data for Prometheus.
- [ ] Database migrations (`scripts/migrate.sh`) successfully run (Indexes created).
- [ ] Deployment automated via `scripts/deploy.sh` or CI/CD pipeline.
- [ ] `RUNBOOK.md` is updated and available for the ops team.
