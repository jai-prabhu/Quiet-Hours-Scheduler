# Quiet Hours Scheduler

An application that allows authenticated users to create silent-study time blocks.  
A scheduled CRON function emails each user 10 minutes before their block starts, ensuring no overlap for the same user.  
Data is stored in MongoDB.

---

## 🚀 Live Demo

👉 [Live Deployment URL](https://quiet-hours-scheduler-jade.vercel.app/)

---

## ⚡ Tech Stack

- **Frontend**: Next.js (React)
- **Backend**: Supabase (Auth + Row-Level Security)
- **Database**: MongoDB
- **CRON Function**: Cron-jobs.org


**Features**:
- User Authentication (Sign up / Login)
- Add / Edit / Delete Silent Study Time Blocks
- CRON function triggers email 10 minutes before block start
- Email sent only once per block, no overlaps
- Data stored and retrieved from MongoDB

---

## ✅ Features

- Authenticated User Flow
- Time Block Creation Interface
- Automated Email Notifications  
- No Duplicate Notifications for Same Time Block  

---

## ⚡ Tech Stack

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
  - Authentication
  - Row-Level Security
  - Edge Functions (for CRON)
- [MongoDB](https://www.mongodb.com/)
- [SendGrid](https://sendgrid.com/en-us)

---

## 🧱 Setup Instructions

1. Clone the repository  
```bash
git clone https://github.com/jai-prabhu/Quiet-Hours-Scheduler.git
```
## Setup ENV Variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
MONGODB_URI=your-mongodb-connection-string
SENDGRID_API=smtp.example.com
FROM_EMAIL=emaol@example.com

## Run Development

```bash
npm run dev
```

## 📖 How CRON Works

1. Supabase Edge Function runs every minute

2. Checks for upcoming silent-study time blocks

3. Sends email notification 10 minutes before block starts

4. Ensures only one email per block per user

## ✅ Deployment

- Deployed on Vercel:
[VERCEL](https://quiet-hours-scheduler-jade.vercel.app/)

## 📜 License

MIT License

## 👨‍💻 Contact

Developed by Jai Prabhu J – jaiprabhu369@gmail.cojm
