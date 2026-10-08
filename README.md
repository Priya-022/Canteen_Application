# Canteen_Application

## CanteenPulse

A responsive campus canteen crowd-predictor SPA built with React, TypeScript, Vite, and Supabase.

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a Supabase project and copy `.env.example` to `.env.local`. Set the project URL and **publishable** key from the project’s Connect/API settings:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   The publishable key is intended for the browser. **Never put a Supabase secret or `service_role` key in a `VITE_` variable.**

3. In the Supabase SQL Editor, run [`supabase/setup.sql`](./supabase/setup.sql). It creates the menu table and row-level security policies: everyone can read the menu, but only a user with the admin role in trusted `app_metadata` can change menu rows.

4. In Supabase Authentication settings, enable **Anonymous Sign-Ins** for guest access.

5. Create an admin email/password user in Supabase Authentication. In that user’s trusted **app metadata**, assign:

   ```json
   { "role": "admin" }
   ```

   Set this through the Supabase Dashboard or a trusted server using the service-role key. Do not let the browser set its own admin metadata. Have the admin sign in again after changing the role so the JWT contains the new claim.

6. Start the app:

   ```sh
   npm run dev
   ```

   Restart the dev server after changing `.env.local`.

## Features

- Separate guest and admin sign-in paths using Supabase Auth.
- Guests can view the canteen menu, availability, crowd estimate, and peak-hour trends.
- Admins can add, edit, price, mark available/unavailable, and remove menu items.
- Menu data is stored in Supabase; browser clients are restricted by database row-level security.
- Student crowd feedback is stored locally in the browser and contributes to the selected time slot’s estimate.
- Responsive desktop, tablet, and mobile layouts.

## Prediction notes

Crowd forecasts use a simple sample weekday schedule, not live sensors or a trained machine-learning model. Weekend estimates are adjusted down. Student feedback is blended with the sample estimate for the selected date and time. Replace the illustrative peak-hour schedule with campus observations before using it for real-world decisions.

## Validation

```sh
npm run lint
npm run build
```
