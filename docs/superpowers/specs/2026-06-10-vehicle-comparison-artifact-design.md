# Vehicle Comparison Artifact — Design Spec

**Date:** 2026-06-10
**Type:** Standalone artifact (not integrated into mycars app)

## Purpose

A self-contained HTML artifact that compares two vehicles side-by-side with per-category winner/loser badges and an overall champion verdict.

## Data

Hardcoded sample data — two popular Brazilian hatchbacks:

| Attribute | VW Gol 1.0 Flex | Chevrolet Onix 1.0 Flex |
|---|---|---|
| Engine | 999 cm³ | 999 cm³ |
| Power (cv) | 71 (A) / 68 (G) | 78 (A) / 75 (G) |
| Torque (kgfm) | 9,7 (A) / 9,4 (G) | 10,2 (A) / 9,8 (G) |
| Transmission | Manual 5-speed | Manual 6-speed |
| Fuel | Flex | Flex |
| City consumption | 9,8 km/l | 10,6 km/l |
| Highway consumption | 14,2 km/l | 16,3 km/l |
| Price | R$ 48.000 | R$ 52.000 |

## Winner/Loser Rules

- **Price**: lower wins
- **Power (cv)**: higher wins (alcohol value compared)
- **Torque (kgfm)**: higher wins (alcohol value compared)
- **City consumption (km/l)**: higher wins
- **Highway consumption (km/l)**: higher wins
- **Transmission**: more gears wins
- **Tie or incomparable** → draw

## Layout

Side-by-side car cards with a "VS" divider, spec rows with color-coded winner/loser badges, and an overall champion banner at the bottom.

## Visual States

| State | Treatment |
|---|---|
| Winner cell | Green tint, ✓ badge |
| Loser cell | Red tint, ✗ badge |
| Draw | Gray tint, — badge |
| Champion card | Highlighted border/glow |
| Overall banner | Gradient with winner name and score tally |

## Tech

React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui, bundled via Parcel into a single `bundle.html`.

## Out of Scope

- User-editable car data (hardcoded only)
- Backend integration
- Animations
- Mobile responsiveness (desktop-focused)
