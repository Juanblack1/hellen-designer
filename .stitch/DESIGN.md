# Hellen Designer Design System

## Brand

Luxury beauty identity for Hellen Martins, designer de sobrancelhas. The system should feel intimate, premium and direct: black studio canvas, metallic gold emphasis, clear WhatsApp conversion and an efficient private admin.

## Registers

Landing pages use Brand register. Admin screens use Product register.

## Colors

- Background: `#050403`
- Surface: `#100C08`
- Surface raised: `#17110B`
- Surface soft: `#21170D`
- Text primary: `#F8EAD0`
- Text muted: `#C6B696`
- Gold primary: `#D9A441`
- Gold bright: `#FFE2A0`
- Gold deep: `#9B681D`
- Line: `#4D3517`
- Success: `#63D697`
- Warning: `#F4C873`
- Danger: `#FF7E61`

### Admin Light Product Mode

The admin can use a light operational mode inspired by mobile salon management apps while preserving the Hellen palette:

- Canvas: `#F7F3EA`
- Surface: `#FFFDF8`
- Muted surface: `#F1F3F8`
- Ink: `#242737`
- Muted ink: `#858B9B`
- Border: `#E2DDD2`
- Accent: `#B97714`
- Accent strong: `#86530A`

Use this mode only for the private admin app. Landing pages remain black studio canvas.

## Typography

- Display: Playfair Display, Georgia, serif.
- Body: Montserrat, Aptos, sans-serif.
- Admin labels: Montserrat, Aptos, sans-serif.
- Headlines use strong contrast and generous line-height on landing.
- Admin text uses compact hierarchy, tabular numbers and left alignment.

## Shape

- Controls: 8px radius.
- Admin cards and repeated items: 8px radius.
- Brand media frames may use 20px radius when the content is photographic.
- Pills are reserved for status labels and compact filters.

## Layout

- Landing: first viewport must immediately show Hellen Designer, a real brand/portrait signal, prices or service anchor, and WhatsApp access. It must not show admin/login access.
- Admin: fixed or sticky navigation, dense metrics, day agenda, client/payment status and inline editing.
- Admin light mode: app-like sidebar drawer, weekly date strip, clean agenda timeline, floating create action and full-screen mobile sheets for appointment/blocking forms.
- Avoid nested cards. Sections are full-width bands or unframed layouts.

## Components

- Navigation bar with brand mark, WhatsApp and Instagram access.
- Service price list with active/published state.
- Gallery grid for photos and social art.
- Agenda rows with status, time, client, service, amount and quick actions.
- Client drawer/detail area.
- shadcn/Tailwind primitives for buttons, cards and inputs use the same semantic CSS tokens.
- Finance list with paid, partial, pending and canceled states.
- Landing editor for business data, services and gallery publication.

## Motion

- Landing may use subtle entrance and shimmer effects on gold details.
- Admin uses short 120-180ms state transitions only.
- Honor reduced motion.

## Copy

Use direct Portuguese. Prefer action-object labels:

- `Chamar no WhatsApp`
- `Salvar servico`
- `Publicar foto`
- `Marcar como concluido`
- `Registrar recebimento`

Avoid customer portal language, checkout language and platform marketing language.
