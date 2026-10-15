# Demo app: expected results

The demo app (`demo/server.js`) is a deliberately vulnerable, local-only imitation of a small Supabase-backed app. All data and keys in it are fake. It exists so anyone can reproduce validra-check's results without scanning a real site.

## Run it

```bash
git clone https://github.com/Teo102/validra-check
cd validra-check
npm run demo
```

Then, in a second terminal from the same folder:

```bash
node bin/validra-check.js http://127.0.0.1:54321
```

(Port 54321 is the default port of a local Supabase stack; stop it first if you have one running.)

## What the demo contains

| Part | Setup | Should be reported? |
|---|---|---|
| `app.js` | Contains a fake Stripe secret key (`sk_live_…`) | Yes |
| `app.js` | Contains the Supabase URL and the public anon key | No (public by design), but used for the checks below |
| Table `profiles` | No RLS: returns a row with `email` and `full_name` | Yes, critical |
| Table `orders` | RLS on: anonymous requests get no rows | No |
| Table `products` | Public catalog, readable on purpose | Yes, high — the documented "intentionally public table" false positive |
| Bucket `avatars` | Public | Yes |
| Bucket `invoices` | Private | No |
| Table list | Published at `/rest/v1/` | Yes, as information |

## Expected output

```
✖ 4 issue(s) found

  CRITICAL  Stripe secret key exposed in client code  [weakness]
  CRITICAL  Table "profiles" is readable without logging in  [demonstrated]
  HIGH      Table "products" is readable without logging in  [demonstrated]
  MEDIUM    Storage bucket "avatars" is public  [weakness]
  INFO      Database table list is public  [observation]
```

Exit code: `2`.

The value `alice@example.com` from the `profiles` table must **not** appear anywhere in the output or in `--json`: the tool only reports column names.

This exact result is checked automatically by `test/demo.test.js` on every push.

## What the demo does not imitate

It only answers the `GET` requests validra-check sends, it ignores the key it receives (a real Supabase would enforce it), and it has no authentication, so it cannot be used to test anything behind a login.
