# Deploy to Render

`render.yaml` creates three things on [Render](https://render.com): the API (`musfir-backend`), the storefront
(`musfir-frontend`) and a PostgreSQL database (`musfir-db`), all in Frankfurt (closest to Poland).

## One-time setup (about 15 minutes)

1. Sign up at render.com and connect your GitHub account; give Render access to the `musfyrprint` repository.
2. In Render: **New → Blueprint**, pick the repository and the branch that contains `render.yaml`.
3. Render asks for the values marked `sync: false`:

   | Variable | What to enter |
   | --- | --- |
   | `BOOTSTRAP_ADMIN_EMAIL` | Your e-mail – this becomes the first back-office login |
   | `BOOTSTRAP_ADMIN_PASSWORD` | A long, unique password (12+ characters) |
   | `BRAND_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL` | The shop's contact e-mail |
   | `API_INTERNAL_URL` | `https://musfir-backend.onrender.com` |
   | `NEXT_PUBLIC_SITE_URL` | `https://musfir-frontend.onrender.com` |

   If Render shows a different address for a service (it adds a suffix when a name is taken), use the address shown
   on that service's page, update the two URL variables, and redeploy the frontend.
4. Click **Apply**. The first build takes 5–15 minutes. When both services show **Live**, open the frontend URL.
5. Sign in at `/admin` with the e-mail and password from step 3. Then delete `BOOTSTRAP_ADMIN_PASSWORD` from the
   backend's Environment page – it is only needed for the first start.

## What to expect on the free plan

* Free services **sleep after ~15 minutes without visitors**; the next visit wakes them, which can take a minute or
  more for the Java backend. Fine for showing the site, not for real customers.
* Free PostgreSQL databases are **deleted after a limited period** (check Render's current free-plan terms).
  Upgrade the database before you rely on its data.
* Recommended for launch: backend and frontend on **Starter**, database on a paid plan with backups.

## Going live with the real catalogue

* Change the backend's `SPRING_PROFILES_ACTIVE` from `prod,demo` to `prod` on a **fresh** database to start without
  the sample products (switching an existing demo database keeps the demo rows).
* Add your domain (e.g. `musfirprint.pl`) under the frontend's **Settings → Custom Domains**, then update
  `NEXT_PUBLIC_SITE_URL` and redeploy.

## Notes and checks

* The frontend calls the backend over its public URL. If you upgrade to paid plans, you can switch
  `API_INTERNAL_URL` to the backend's internal address (Render → backend → Connect → Internal) for lower latency.
* `NEXT_PUBLIC_*` values are built into the storefront, so changing them needs a frontend redeploy.
* This Blueprint was written without access to Render's live documentation. If Render rejects a field during
  **Apply**, the error names it – send it to me and I will adjust the file.
