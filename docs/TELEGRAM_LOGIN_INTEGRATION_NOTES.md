# Telegram Login Integration Notes

The dormitory frontend will use Telegram WebApp authentication when it is launched inside Telegram. The client sends raw Mini App `initData` to the trusted Express backend; the backend must validate the Telegram hash before it accepts the Telegram user identifier or issues a dormitory session. Telegram explicitly states that Mini App init data must not be trusted until server-side validation has completed.[1]

For standalone web-browser sign-in, Telegram’s current Login library uses an OpenID Connect flow. It requires BotFather-configured Allowed URLs plus a client ID and client secret; the callback must validate the resulting ID token against Telegram’s JWKS, issuer, audience, and expiry.[2] This feature update therefore provides secure WebApp login and a clear Telegram launch path, while retaining email/password login as the available universal method.

## References

[1] [Telegram Mini Apps documentation](https://core.telegram.org/bots/webapps)

[2] [Telegram Login documentation](https://core.telegram.org/widgets/login)
