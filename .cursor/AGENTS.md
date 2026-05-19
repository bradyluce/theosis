# Theosis — Agent Instructions

This repository contains the code for **Theosis**, an Orthodox Christian study app.

Agents working in this repository must read and follow these instructions before making any changes.

---

# 1. Project Mission

Theosis is a **mobile-first Christian study app** designed primarily for Orthodox Christianity.

The long-term goal is to create the best tool for studying:

- the Bible
- the Church Fathers
- Orthodox theology
- saints and feast days
- liturgical texts

The core experience of the app is:

> A user opens a Bible verse and instantly sees commentary from the Church Fathers and other Orthodox sources.

The app should feel like a **modern Orthodox study Bible + patristic library + daily calendar**.

---

# 2. Core Product Features

The main features of the app will be:

### Bible Reader
Users can read the Bible by:

- book
- chapter
- verse

Eventually the app will support:

- multiple translations
- original language references
- verse search
- verse linking

---

### Patristic Commentary

The most important feature of the app.

When a user views a verse, they should see commentary from:

- Church Fathers
- saints
- theologians
- classical Christian commentators

Each commentary entry should include:

- the author
- the source work
- the excerpt text
- the verse or verse range it relates to

---

### Library

A large searchable collection of Christian works including:

- Church Fathers
- Orthodox theologians
- saints
- homilies
- letters
- treatises

Works should be organized by:

- author
- title
- section

---

### Daily Orthodox Calendar

The app will eventually include:

- saint of the day
- feast days
- fasts
- daily scripture readings
- hymns or troparia
- short saint biographies

---

# 3. Architecture Philosophy

The app must be built around **structured content**, not random text files.

Content must flow through a clean pipeline:


source material
↓
raw content files
↓
normalized structured data
↓
app data layer
↓
UI


Agents must not directly embed large text content inside UI components.

---

# 4. Content Types

The app contains several types of content.

## Bible

Bible content should be structured as:


translation
book
chapter
verse
text


Each verse should have a unique ID.

---

## Commentary

Commentary must be structured like:


commentary_id
verse_reference
verse_range (optional)
author
source_work
text


Commentary entries must always reference the verse(s) they relate to.

---

## Persons

People referenced in the app include:

- Church Fathers
- saints
- theologians
- authors

Each person should have:


person_id
name
era
tradition
short_bio


---

## Works

Books or writings should be structured as:


work_id
title
author
sections
source


---

## Daily Content

Daily Orthodox data should include:


date
saints
feasts
fast_type
readings
hymns


---

# 5. Raw vs Normalized Content

All source material must exist in two forms.

## Raw Content

Original material downloaded from sources:

Examples:

- HTML
- PDF
- TXT
- scraped pages

Raw content must be preserved and never deleted.

---

## Normalized Content

Clean structured data used by the app.

Examples:

- JSON
- database rows
- structured verse/commentary entries

Normalized content is what the UI uses.

---

# 6. Development Principles

Agents must follow these rules when modifying the repository.

### Do not rewrite working code unnecessarily

Preserve existing UI and architecture unless there is a clear problem.

---

### Do not mix mock data with real content

Mock data should be clearly separated.

---

### Prefer clean data layers

UI components should consume structured data.

They should not parse raw text or files directly.

---

### Do not hardcode large content

All large content must come from structured sources.

---

### Preserve source attribution

Every piece of content must track:

- original source
- URL if applicable
- author
- work

---

# 7. Development Workflow

Agents should follow this workflow when making changes.

### Step 1
Understand the repository before editing.

Agents should inspect:

- folder structure
- schemas
- content directories
- ingestion scripts
- UI routes

---

### Step 2
Explain planned changes before making them.

---

### Step 3
Make small incremental changes.

Avoid large uncontrolled rewrites.

---

### Step 4
Summarize changes after each phase.

---

# 8. Content Ingestion Strategy

Content must be added gradually.

Do not attempt to ingest the entire corpus immediately.

The correct order of priority is:

1. Bible text
2. verse-linked commentary
3. Church Father library
4. daily calendar content
5. extended theological library

Agents must focus on **clean structure first, scale second**.

---

# 9. Long-Term Vision

Theosis should eventually function as:

- a study Bible
- a patristic commentary system
- a theological library
- an Orthodox liturgical companion
- a searchable knowledge base of Orthodox Christianity

The architecture should support:

- large-scale text ingestion
- verse linking
- semantic search
- AI-assisted study features

---

# 10. Agent Responsibilities

Agents modifying this repository must:

- respect the existing architecture
- maintain structured content
- avoid hacks or shortcuts
- prioritize maintainability

When uncertain, agents should explain options before acting.