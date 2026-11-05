-- Guest orders get a second secret link for the confirmation e-mail (the checkout token is only ever stored hashed,
-- so it cannot be reproduced later). Either token opens the guest order page.
ALTER TABLE orders ADD COLUMN email_token_hash VARCHAR(64);
