# Brevo Coda Pack - Release Notes

## Version 1.0 - Initial Release

link: https://coda.io/packs/brevo-campaign-creator-39871

### 🚀 Key Features

**Email Campaigns**
- Create and schedule campaigns with Paris timezone support
- Browse email templates with HTML content

**Contact Management** 
- Smart contact creation (checks for duplicates)
- Add contacts to lists automatically
- Real-time contact retrieval from lists

**Organization**
- Create contact lists in folders
- Sync tables for Lists, Folders, and Templates

### 📋 What's Included
- 5 Action Formulas (Create campaigns, contacts, lists, etc.)
- 3 Sync Tables (ContactLists, Folders, EmailTemplates)
- Smart error handling and duplicate prevention
- No-cache data fetching for real-time updates

### 🔑 How to Use

**Getting Your API Key:**
1. Log into your Brevo account
2. Go to Account Settings → SMTP & API
3. Create a new API key with appropriate permissions
4. Copy the key for use in formulas

**Using the Pack:**
- Each formula requires your Brevo API key as the first parameter
- Example: `CreateContact("your-api-key", "email@example.com", "John", "Doe")`
- For sync tables, add your API key when connecting the table

**Why API Key Instead of OAuth:**
- **Simpler Setup**: No complex authorization flows
- **Direct Control**: Full access to your Brevo account features
- **Reliability**: No token expiration or refresh issues
- **Flexibility**: Easy to share across team members or multiple docs

Perfect for managing Brevo campaigns directly from Coda! 🎯