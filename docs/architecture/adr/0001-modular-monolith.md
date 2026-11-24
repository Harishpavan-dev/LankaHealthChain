# ADR 0001: Modular monolith with federated hospital services

Status: Accepted for MVP. Core is one NestJS API with modules and a separate worker boundary.
Three hospital simulators run isolated database credentials. The core never queries hospital
SQL directly; it calls a scoped internal HTTP API and validates local access policy first.

Trade-off: distributed availability/identity-matching complexity exists even in the demo.
Production requires mTLS, asymmetric service tokens, audit review, hospital partnerships,
clinical data governance and professional security review.
