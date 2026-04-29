PRODUCT REQUIREMENTS DOCUMENT
Groundwork
Property Management Platform for the Independent Landlord

Version
1.0 — Draft
Date
March 2026
Status
For Review
Target User
Independent landlords managing 10–20 residential properties
Platform
Web (primary), Mobile-responsive (tenant portal)
Stakeholders
Product, Engineering, Design

1. Product Overview
Groundwork is a property management platform built specifically for the independent landlord — the owner of 10 to 20 properties who is too big to manage on spreadsheets and text messages but too small to justify an enterprise property management system that costs thousands of dollars a month and was designed for a 500-unit apartment complex.

It gives the landlord one place to see every property, every tenant, every payment, every maintenance request, and every lease — and gives tenants one portal to pay rent, report issues, and communicate without needing the landlord's personal phone number.

Groundwork is organized around six modules that work together as a single system: the Tenant Portal (rent payments, maintenance requests, communication), Lease Management (leases, renewals, alerts), Maintenance Tracker (requests, vendor dispatch, resolution), Expense & Income Ledger (per-property P&L), Tenant Records (profile, vehicles, documents), and the Owner Dashboard (portfolio-level view of everything).

Who This Is For
The owner of 12 rental properties who currently collects rent via Zelle, tracks leases in a folder on their desktop, texts tenants directly about repairs, keeps a notebook of which car belongs to which tenant, and has no idea which properties are actually profitable after expenses. Groundwork organizes all of it — without requiring them to become a software power user.

2. Problem Statement
2.1 How Small Landlords Operate Today
The independent landlord with 10–20 properties operates across a tangle of personal tools never designed for property management:

	•	Rent collection via Zelle, Venmo, Cash App, personal checks, or money orders — no payment history, no automated reminders, no receipts
	•	Maintenance requests via text message — no record, no photo, no thread, no way to track whether something was actually fixed
	•	Leases in a folder, a filing cabinet, or an email inbox — no alerts when leases expire, no version tracking, no digital signatures
	•	Tenant information in a phone's contact list — move-in date, vehicle info, emergency contacts all living in the landlord's memory
	•	Expenses tracked in a spreadsheet, a notes app, or not at all — no per-property income/expense view, no tax preparation clarity
	•	Vendor relationships in a text history — no organized record of who fixed what, when, for how much

2.2 What Goes Wrong
	•	Late rent goes unnoticed for days because there is no system to flag it — the landlord only realizes when they check their bank account
	•	Maintenance issues escalate because there is no follow-up system — a tenant texts once about a leak, gets no response, and the leak becomes a lawsuit
	•	Leases expire and renew month-to-month by accident — the landlord loses leverage and the tenant loses clarity
	•	The landlord has no idea which properties make money and which ones eat it — all income goes to the same account, all expenses are mixed
	•	Parking disputes become tense because there is no record of who is authorized to park where — no vehicle documentation

2.3 Why Existing Tools Don't Fit

Tool
What It Does
Why It Doesn't Fit
Buildium / AppFolio
Enterprise property management — full accounting, maintenance, leasing, screening
Built for 50–500+ units. $250–$1,500+/mo. Complex onboarding. Overkill for 10–20 properties.
TurboTenant / Avail
Free/low-cost tools for small landlords — basic rent collection and listings
Thin feature set. No vendor management, no expense ledger depth, no vehicle records, weak maintenance workflow.
Cozy (now Apartments.com)
Rent collection, basic screening
Primarily a listing/collection tool — no maintenance, no lease management, no communication hub.
Spreadsheets + Zelle
Whatever the landlord builds themselves
No automation, no tenant-facing portal, no alerts, no audit trail, breaks at 10+ properties.

3. User Personas

Persona
Who They Are
Core Need
Current Frustration
The Owner / Landlord
Individual or couple. 10–20 residential properties. Self-managed or lightly assisted. Has a day job or other business. Wants passive income to actually feel passive.
See everything about every property in one place. Stop managing by text message. Know which properties are profitable.
Spends evenings chasing rent, returning maintenance texts, and hunting for lease documents they know they saved somewhere.
The Tenant
Renting a single unit. Has a smartphone. Does not want to call or text the landlord directly for routine things. Wants confirmation that their payment was received and their request is being handled.
Pay rent easily, submit requests without awkward texts, get updates without having to follow up.
Sends a Venmo with no confirmation. Texts about a repair and hears nothing for days. Doesn't know when their lease expires.
The Maintenance Vendor
Plumber, electrician, HVAC tech, handyman. Works with multiple property owners. Needs clear job details and confirmed payment.
Clear work order: what the issue is, where the property is, contact info, photos of the problem.
Gets called with vague instructions, shows up to find the issue is different than described, invoices slowly.

4. Feature Modules
Groundwork is organized into six modules. All six are accessible from the owner dashboard. Tenants access a simplified portal containing only the modules relevant to them (rent, maintenance, messages, their profile).

Module 1 — Tenant Portal
The tenant-facing layer of the platform. Accessible via a unique link sent at move-in. Mobile-first design. No app download required — runs in any browser. Each tenant sees only their own unit and their own data.

1.1 Rent Payment
	•	System MUST allow tenants to pay rent online via ACH bank transfer (free) and debit/credit card (fee passed to tenant or absorbed by owner — owner-configurable)
	•	System MUST send automated payment reminders: 5 days before due date, 1 day before due date, and on the due date if unpaid
	•	System MUST send an instant payment confirmation receipt to the tenant via email and in-portal notification
	•	System MUST flag a payment as late the day after the due date and notify the owner
	•	System MUST display a tenant's full payment history: date, amount, method, status (paid / pending / late / partial)
	•	System MUST support partial payments — owner can accept or decline partial payment per their policy, set at the property level
	•	System MUST support recurring autopay — tenant can enroll to have rent auto-debited on the same day each month
	•	System SHOULD support late fee application — owner configures a flat or percentage late fee that is automatically added after a grace period
	•	System MUST generate a year-end payment summary for tenants (for rental assistance, tax, or housing application purposes)

1.2 Maintenance Requests
	•	System MUST allow tenants to submit a maintenance request with: written description, urgency level (Emergency / Urgent / Routine), category (Plumbing / Electrical / HVAC / Appliance / Structural / Pest / Other), and photo upload (up to 10 photos per request)
	•	System MUST notify the owner immediately upon submission with the full request detail and photos
	•	System MUST allow owners to update the request status: Received / Assigned to Vendor / In Progress / Scheduled (with date) / Resolved
	•	System MUST notify the tenant of every status update automatically — no manual message required
	•	System MUST allow two-way messaging within the request thread — tenant and owner can communicate in context without texting
	•	System MUST flag Emergency requests distinctly and trigger an immediate push notification and email to the owner
	•	System MUST keep a full request history per unit — every request, every update, every message, every photo, timestamped permanently
	•	System SHOULD allow tenants to mark a request as resolved or reopen it if the issue returns

1.3 Tenant Communication Hub
	•	System MUST provide an in-portal messaging thread between tenant and owner — distinct from the maintenance request thread
	•	System MUST allow owners to send broadcast messages to all tenants (e.g., 'Water will be shut off Thursday 9am–12pm for maintenance')
	•	System MUST allow owners to send property-specific messages (e.g., to all tenants in a single building)
	•	System MUST archive all messages with sender, timestamp, and read receipt
	•	System SHOULD allow tenants to view important notices in a dedicated 'Notices' tab — lease renewal alerts, upcoming inspections, policy updates

1.4 Tenant Profile & Documents
	•	System MUST display the tenant's current lease summary: unit address, start date, end date, monthly rent amount, security deposit held
	•	System MUST allow tenants to download their signed lease and any addenda from the portal
	•	System SHOULD allow tenants to update their emergency contact information directly in the portal

Module 2 — Lease Management
Centralized management of all leases across the portfolio. No more hunting for a PDF in an email thread from 2 years ago.

2.1 Lease Storage & Organization
	•	System MUST allow owners to upload a signed lease PDF per tenant and attach it to the tenant record
	•	System MUST extract and store key lease fields on upload (via form input or OCR-assisted extraction): tenant names, unit address, lease start date, lease end date, monthly rent, security deposit amount, late fee policy
	•	System MUST display a lease status badge on every tenant record: Active / Expiring Soon (within 60 days) / Month-to-Month / Expired
	•	System MUST support multiple active lease documents per tenant (original lease + addenda + renewals) in a versioned document history

2.2 Renewal Alerts & Workflow
	•	System MUST send the owner an alert at 90 days, 60 days, and 30 days before any lease expiration
	•	System MUST display a 'Leases Expiring Soon' panel on the owner dashboard with a count and list of affected units
	•	System SHOULD allow owners to mark a renewal as 'In Progress', 'Offered', 'Signed', or 'Not Renewing' — to track where each expiring lease stands
	•	System SHOULD support digital lease renewal: owner generates a renewal addendum, sends it to the tenant via the portal, tenant signs electronically
	•	System MUST flag any unit whose lease has expired with no renewal action taken — shown as a warning on the dashboard

2.3 Digital Signatures
	•	System SHOULD integrate with DocuSign or HelloSign for electronic lease signing — owner sends lease via platform, tenant signs digitally, signed copy stored automatically in tenant record
	•	System MUST log all signature events: who signed, from what IP address, at what time — for legal audit trail

Module 3 — Maintenance Tracker
The owner-side view of all maintenance activity across the portfolio. Connects to the tenant-facing request system and extends it with vendor management and cost tracking.

3.1 Request Management
	•	System MUST display all open maintenance requests across all properties in a unified queue, sortable by: urgency, date submitted, property, status
	•	System MUST allow the owner to filter requests by property, status, category, and date range
	•	System MUST show a count of open Emergency and Urgent requests prominently on the dashboard — these cannot be missed
	•	System MUST maintain a complete closed request archive per unit — useful for move-out inspections and dispute resolution

3.2 Vendor Management
	•	System MUST allow owners to build a vendor directory: vendor name, trade/category (Plumber, Electrician, HVAC, General Handyman, Pest Control, Landscaping, etc.), phone, email, typical rate, notes, preferred status flag
	•	System MUST allow owners to assign a vendor to any open maintenance request directly from the request detail view
	•	System MUST automatically send the assigned vendor a work order notification via email and SMS containing: property address, unit number, issue description, tenant contact name and phone, photos from the original request, and scheduled access window
	•	System MUST allow owners to set a maintenance budget per request before dispatching a vendor
	•	System MUST allow vendors to be rated after job completion — owner records a simple 1–5 star rating and optional note, stored in the vendor's profile
	•	System SHOULD allow the owner to track vendor invoice amounts against each request — actual cost logged and attached to the request record

3.3 Recurring Maintenance
	•	System SHOULD allow owners to create recurring maintenance schedules: 'HVAC filter change — every 6 months — all units', 'Smoke detector check — annual — all properties'
	•	System MUST send a reminder notification when a recurring maintenance task is due
	•	System MUST log each completion of a recurring task with date and notes

Module 4 — Expense & Income Ledger
Per-property financial tracking. Not a full accounting suite — a clear, organized record of what each property brings in and costs, month by month.

4.1 Income Tracking
	•	System MUST automatically record every rent payment as income in the ledger for the corresponding property and month
	•	System MUST allow owners to record other income per property: late fees collected, pet fees, parking fees, laundry income, application fees
	•	System MUST display monthly and year-to-date income per property

4.2 Expense Tracking
	•	System MUST allow owners to log expenses per property with: amount, date, category (Maintenance/Repair, Mortgage, Insurance, Property Tax, Utilities, Landscaping, Pest Control, Management Fee, Capital Improvement, Other), vendor or payee name, notes, and receipt photo upload
	•	System MUST auto-populate maintenance expenses from vendor invoices logged in the Maintenance Tracker — no double entry
	•	System MUST display monthly and year-to-date expenses per property by category
	•	System SHOULD display a running net operating income (income minus expenses) per property per month

4.3 Portfolio View & Reporting
	•	System MUST display a portfolio-level summary: total monthly income across all properties, total monthly expenses, net income
	•	System MUST display a per-property P&L comparison: which properties are most profitable, which have the highest expense ratios
	•	System MUST support date range filtering on all financial views: current month, last 3 months, year-to-date, custom range
	•	System MUST support CSV export of all income and expense data — for tax preparation, accountant handoff, or personal records
	•	System SHOULD generate a simple annual income/expense summary report per property in PDF format — formatted for tax season hand-off

Module 5 — Tenant Records
The complete profile for every tenant. Everything the landlord knows about a tenant — in one place, not spread across a phone, a filing cabinet, and a memory.

5.1 Tenant Profile
	•	System MUST store per-tenant: full legal name, date of birth, phone, email, move-in date, move-out date (if applicable), unit assigned, lease reference
	•	System MUST allow owners to store emergency contact information: name, relationship, phone, email
	•	System MUST allow owners to add internal notes per tenant — private, not visible to the tenant
	•	System MUST display a tenant activity timeline: move-in, lease signings, payment history, maintenance requests, messages — all in one chronological view

5.2 Vehicle Records
	•	System MUST allow owners to record one or more vehicles per tenant: make, model, year, color, license plate number, state of registration
	•	System MUST display all registered vehicles per unit on the tenant profile
	•	System MUST allow owners to add a parking space or spot assignment per vehicle
	•	System MUST allow owners to search or filter all vehicles across the portfolio by license plate — for parking enforcement and dispute resolution
	•	System SHOULD send a reminder to the owner to verify vehicle information annually or at lease renewal
	•	System SHOULD allow owners to flag a vehicle as unauthorized — for record-keeping during parking disputes

5.3 Document Vault
	•	System MUST allow owners to upload documents per tenant: signed lease (synced with Lease Management module), government ID copy, pet agreement, parking addendum, move-in inspection report, move-out inspection report, any written notices
	•	System MUST display all documents in a clean list with filename, upload date, and document type tag
	•	System MUST allow tenants to download documents shared with them by the owner from their portal

5.4 Move-In / Move-Out Workflow
	•	System MUST support a move-in checklist: owner records unit condition at move-in with notes and photos — stored against tenant record
	•	System MUST support a move-out checklist: same format — allows direct comparison to move-in condition for security deposit decisions
	•	System MUST track security deposit: amount collected, date collected, bank account held in (owner note), return amount, return date, deductions itemized

Module 6 — Owner Dashboard
The first screen the owner sees on login. A command center — not a data dump. Every number that matters, every alert that needs attention, every action that is overdue.

6.1 Portfolio Snapshot
	•	System MUST display at a glance: total units, occupied units, vacant units, occupancy rate
	•	System MUST display current month rent collection status: total expected, total collected, total outstanding, number of late payments
	•	System MUST display open maintenance request count by urgency: Emergency / Urgent / Routine — each a clickable link into the maintenance queue
	•	System MUST display leases expiring within 60 days with unit addresses and days remaining

6.2 Alert Feed
	•	System MUST surface a prioritized alert feed: late payments, new maintenance requests, lease expiration warnings, overdue recurring maintenance tasks, unsigned renewal documents
	•	System MUST allow owners to dismiss alerts individually or mark them as addressed
	•	System MUST send a daily digest email to the owner each morning: summary of overnight activity, current outstanding items

6.3 Property List View
	•	System MUST display every property as a card with: address, tenant name, rent amount, last payment date, payment status, lease expiration date, open maintenance requests
	•	System MUST allow the owner to click any property card to drill down into the full property detail: tenant profile, lease, payment history, maintenance history, expenses
	•	System MUST support adding a new property and a new tenant with a guided setup flow

5. Non-Functional Requirements

Category
Requirement
Security
All data encrypted at rest (AES-256) and in transit (TLS 1.3). Role-based access: owner sees everything; tenant sees only their unit and data. Two-factor authentication available for owner account. Payment data handled via Stripe — no raw card data stored on platform.
Privacy
Tenant personal data (ID, DOB, vehicle) stored securely, never shared with third parties. Owner can delete a tenant record after move-out, subject to a 7-year financial record retention minimum for tax compliance. Tenants can request a copy of their data.
Mobile
Tenant portal fully functional on mobile browser — no app download required. Owner dashboard mobile-responsive. Native iOS and Android apps are V2.
Performance
Dashboard load time: < 2 seconds. File upload (photos, PDFs): up to 25MB per file. Payment processing: Stripe webhook confirmation within 5 seconds of payment.
Reliability
99.9% uptime target. Automated database backups daily. Payment processing via Stripe — inherits Stripe's 99.99% uptime SLA.
Notifications
All critical notifications (late payment, emergency maintenance, lease expiration) delivered via both email and in-app. Owner can configure which notifications they receive via push vs. email. Daily digest email at 7am local time.
Data export
All data exportable by owner at any time: tenant list (CSV), payment history (CSV), expense ledger (CSV), lease documents (ZIP). No data lock-in.

6. Technical Architecture
6.1 Stack
	•	Frontend: Next.js / React — owner dashboard and tenant portal in a single codebase, role-based routing
	•	Backend: Python / FastAPI or Node.js / Express — REST API serving both dashboard and portal
	•	Database: PostgreSQL — properties, units, tenants, leases, payments, maintenance requests, expenses, vehicles, documents
	•	File storage: AWS S3 — lease PDFs, maintenance photos, receipt images, inspection photos
	•	Payments: Stripe Connect — ACH and card processing, automatic late fee logic, payment webhooks, payout to owner bank account
	•	Email / SMS: SendGrid (email), Twilio (SMS for vendor work order notifications and tenant payment reminders)
	•	E-signature: DocuSign API or HelloSign API — lease signing workflow
	•	Push notifications: Firebase Cloud Messaging — browser push and (V2) mobile push
	•	Infrastructure: AWS ECS Fargate (API), RDS PostgreSQL, S3, CloudFront (CDN for static assets)

6.2 Core Data Model

Entity
Key Fields
Relationships
Owner
id, name, email, phone, subscription_tier, stripe_account_id
Has many Properties
Property
id, owner_id, address, city, state, zip, property_type, purchase_date, mortgage_payment, notes
Has many Units
Unit
id, property_id, unit_number, bedrooms, bathrooms, sqft, current_tenant_id
Has one Tenant (current), many Leases
Tenant
id, unit_id, full_name, dob, phone, email, move_in_date, move_out_date, emergency_contact, notes
Has many Vehicles, Documents, Payments, MaintenanceRequests
Vehicle
id, tenant_id, make, model, year, color, plate_number, plate_state, parking_spot, authorized_flag
Belongs to Tenant
Lease
id, unit_id, tenant_id, start_date, end_date, monthly_rent, security_deposit, status, pdf_url, signed_at
Belongs to Unit and Tenant
Payment
id, tenant_id, unit_id, amount, due_date, paid_date, method, status, stripe_payment_id, late_fee_amount
Belongs to Tenant
MaintenanceRequest
id, unit_id, tenant_id, category, urgency, description, status, photos[], vendor_id, cost, created_at, resolved_at
Belongs to Unit; assigned to Vendor
Vendor
id, owner_id, name, trade, phone, email, rate, notes, rating, preferred
Has many MaintenanceRequests assigned
Expense
id, property_id, amount, date, category, payee, notes, receipt_url, maintenance_request_id (nullable)
Belongs to Property
Message
id, thread_id, sender_type (owner/tenant), sender_id, body, read_at, created_at
Belongs to Thread (per unit)

7. User Stories
Owner
	•	As an owner, I want to see all my properties and their rent payment status on one screen when I log in so I don't have to check Zelle, text messages, and a spreadsheet separately.
	•	As an owner, I want to be notified immediately when a tenant submits an emergency maintenance request so I can respond the same day.
	•	As an owner, I want to assign a maintenance request to a plumber in my vendor list and have them automatically emailed a work order so I don't have to make a phone call.
	•	As an owner, I want to see the lease expiration dates for all my tenants 90 days in advance so I can start renewal conversations before they become urgent.
	•	As an owner, I want to see which of my 15 properties made the most money this year and which ones are costing me the most in repairs.
	•	As an owner, I want to export all income and expenses for a property to give to my accountant in January without spending a weekend digging through records.

Tenant
	•	As a tenant, I want to pay my rent online and get an instant confirmation so I never have to wonder if my payment went through.
	•	As a tenant, I want to submit a repair request with photos from my phone so my landlord can see exactly what the problem looks like.
	•	As a tenant, I want to receive a notification when my repair request status changes so I don't have to follow up repeatedly.
	•	As a tenant, I want to message my landlord through the portal so I don't have to text their personal number for non-emergency things.
	•	As a tenant, I want to see when my lease expires so I can plan accordingly.

Vendor
	•	As a vendor, I want to receive a clear work order by email and SMS that includes the address, the issue description, photos, and the tenant's contact info so I can show up prepared.

8. Business Model

Tier
Price
Properties
Key Features
Starter
$29/mo
Up to 5 units
Rent collection, maintenance requests, tenant profiles, vehicle records, basic messaging
Growth
$59/mo
Up to 20 units
Everything in Starter + lease management, vendor directory, expense ledger, digital signatures, recurring maintenance, broadcast messaging
Portfolio
$99/mo
Up to 50 units
Everything in Growth + financial reports, CSV export, daily digest email, priority support, multi-property batch actions

Payment processing fees: ACH bank transfer 0.8% (capped at $5). Debit/credit card 2.9% + $0.30. Owner-configurable whether fee is passed to tenant or absorbed. E-signature credits included in Growth and Portfolio tiers; Starter pays per-signature.

Benchmark: TurboTenant charges $10.75/unit/month for their premium plan. Avail charges $7/unit/month. Groundwork at $59/month for 20 units is $2.95/unit — priced as a clear value relative to alternatives, with meaningfully more feature depth.

9. Out of Scope — V1
	•	Tenant screening — background and credit checks. A natural V2 add-on via TransUnion SmartMove or similar API. V1 focuses on active tenants, not applicants.
	•	Vacancy and listing management — advertising units on Zillow, Apartments.com. V1 manages occupied units; listing integration is V2.
	•	Full accounting / bookkeeping — Groundwork tracks income and expenses but does not replace QuickBooks or do bank reconciliation. It produces clean data that accountants can work with.
	•	Mortgage and insurance tracking — owners can note mortgage payment amounts but Groundwork does not connect to lenders or insurance providers.
	•	Multi-owner / property management company features — V1 is single-owner. A PM company managing properties on behalf of multiple owners is a separate product track.
	•	Native iOS and Android apps — web-first in V1. Mobile-responsive tenant portal covers the majority of tenant use cases. Native apps are V2.

10. Risks & Mitigations

Risk
Likelihood
Impact
Mitigation
Owner adoption friction — setting up 15 properties and 15 tenant profiles is a one-time burden that creates drop-off
High
High
Guided onboarding wizard. Bulk import via CSV for existing tenant data. Concierge onboarding call for Growth/Portfolio tier. Partial setup is still useful — even one property live is value delivered.
Tenant adoption friction — tenants resistant to using a portal instead of texting
Medium
Medium
Owner sends a move-in welcome email with portal link from inside the platform. Portal requires no account creation — tenants log in via a magic link sent to their email. Frictionless first login.
Payment disputes — tenant claims they paid, system shows no record
Low
High
Stripe payment receipts serve as authoritative record. All payment events logged with Stripe payment ID. Owner can manually mark a payment as received (e.g., for cash rent) with a note.
Maintenance photo storage costs escalating at scale
Medium
Low
S3 costs are low at small scale. Compress photos on upload (max 2MB per photo after compression). Automatically archive photos for requests closed more than 2 years ago to cold storage (S3 Glacier).
E-signature legal validity varies by state
Low
Medium
Use DocuSign or HelloSign — both comply with ESIGN Act (federal) and UETA (state). Display a disclaimer that owners should verify e-signature requirements for their specific jurisdiction.
Data privacy breach exposing tenant PII
Low
Critical
AES-256 encryption, TLS 1.3, role-based access, no raw payment data stored, annual security review, SOC 2 Type II as a Year 2 certification target.

11. Open Questions
	•	Rent collection float: When a tenant pays via ACH, Stripe holds funds for 2 business days before payout. Is this acceptable, or do owners need same-day or next-day payout? Stripe Instant Payout is available at a 1% fee — should this be the default or an option?
	•	Vendor portal: Should vendors get their own lightweight login to view and update work orders, or is email/SMS notification sufficient for V1?
	•	Utility tracking: Several small landlords pay utilities on behalf of tenants and bill them back. Should Groundwork support utility expense tracking and tenant billing for utilities, or is this out of scope?
	•	Inspection reports: The move-in/move-out checklist is a critical legal document. Should it support a structured checklist format (room by room, condition ratings) or is a freeform notes + photos approach sufficient for V1?
	•	Multi-unit properties: A property with 4 units is one property address but 4 tenant relationships. The data model supports this via the Unit entity, but the onboarding flow needs to handle both single-unit and multi-unit properties gracefully.

The Right Tool for the Right Scale
Enterprise property management software solves problems at 500 units. Spreadsheets and text messages break at 15. Groundwork is built for the gap — the independent landlord who has enough properties to need real infrastructure and few enough that the infrastructure should feel simple. Every feature in this document earns its place by solving a problem that actually costs a 15-property landlord time, money, or sleep.

This document is a working draft. Pricing, technical stack, and feature scope are subject to revision. Nothing herein constitutes legal advice on landlord-tenant law, which varies by jurisdiction.
