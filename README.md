# Task Manager — AWS Elastic Beanstalk Deployment

A simple full-stack task manager application deployed on **AWS Elastic Beanstalk** with an **Amazon RDS MySQL** database.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              AWS Elastic Beanstalk               │
│                                                  │
│  ┌──────────────┐       ┌───────────────────┐   │
│  │   Frontend   │       │     Backend       │   │
│  │  (HTML/CSS/  │──────▶│  (Node.js/Express)│   │
│  │     JS)      │       │    Port 8080      │   │
│  └──────────────┘       └────────┬──────────┘   │
│                                  │               │
└──────────────────────────────────┼───────────────┘
                                   │
                          ┌────────▼────────┐
                          │  Amazon RDS     │
                          │  (MySQL 8.0)    │
                          └─────────────────┘
```

## Project Structure

```
elastic-beanstalk-project/
├── .ebextensions/
│   └── 01-nodecommand.config   # EB configuration
├── public/
│   └── index.html              # Frontend UI
├── app.js                      # Backend Express server
├── package.json                # Node.js dependencies
├── .env.example                # Environment variables template
├── .gitignore
└── README.md
```

---

## Prerequisites

- [AWS Account](https://aws.amazon.com/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured
- [EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html) installed
- [Node.js](https://nodejs.org/) (v16+) installed locally
- Git installed

---

## Step-by-Step Deployment

### Step 1: Configure AWS CLI

```bash
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, default region (e.g., `us-east-1`), and output format (`json`).

---

### Step 2: Install Dependencies Locally (Optional — for local testing)

```bash
cd elastic-beanstalk-project
npm install
```

To test locally, create a `.env` file from the example:

```bash
cp .env.example .env
```

Update `.env` with your local MySQL credentials, then run:

```bash
npm start
```

Visit `http://localhost:8080` in your browser.

---

### Step 3: Initialize Elastic Beanstalk

```bash
eb init
```

When prompted:
1. Select your **region** (e.g., `us-east-1`)
2. Create a **new application** — name it `task-manager`
3. Select platform: **Node.js**
4. Select platform branch: **Node.js 18**
5. Choose **No** for CodeCommit
6. Choose **Yes** for SSH (select or create a key pair)

---

### Step 4: Create the Elastic Beanstalk Environment with RDS

```bash
eb create task-manager-env --database --database.engine mysql --database.instance db.t3.micro --database.username admin --database.password 'Jagabanthebadguy2027!!!'
```

> ⚠️ Replace `YourSecurePassword123!` with a strong password. The password must be at least 8 characters.

This command will:
- Create an Elastic Beanstalk environment
- Provision an RDS MySQL instance
- Automatically set the `RDS_*` environment variables on the EC2 instances

**Wait 5–10 minutes** for the environment to launch.

---

### Step 5: Set the Database Name Environment Variable

Elastic Beanstalk sets `RDS_HOSTNAME`, `RDS_USERNAME`, `RDS_PASSWORD`, and `RDS_PORT` automatically. You need to add the database name:

```bash
eb setenv RDS_DB_NAME=taskdb
```

Then create the database on the RDS instance. Connect via the EB environment or use a bastion host:

```bash
# Get the RDS endpoint
aws rds describe-db-instances --query "DBInstances[?DBInstanceIdentifier=='<your-rds-id>'].Endpoint.Address" --output text

# Connect and create the database
mysql -h <RDS_ENDPOINT> -u admin -p -e "CREATE DATABASE IF NOT EXISTS taskdb;"
```

> **Alternative**: SSH into the EC2 instance and run the mysql command from there:
> ```bash
> eb ssh
> sudo yum install mysql -y
> mysql -h $RDS_HOSTNAME -u $RDS_USERNAME -p$RDS_PASSWORD -e "CREATE DATABASE IF NOT EXISTS taskdb;"
> ```

---

### Step 6: Deploy the Application

```bash
eb deploy
```

---

### Step 7: Open the Application

```bash
eb open
```

This opens your deployed application in the browser. You should see the Task Manager UI where you can add, complete, and delete tasks.

---

## Useful EB CLI Commands

| Command | Description |
|---------|-------------|
| `eb status` | Check environment health and status |
| `eb logs` | View application logs |
| `eb health` | View detailed health information |
| `eb ssh` | SSH into the EC2 instance |
| `eb config` | Edit environment configuration |
| `eb terminate` | **Delete** the environment and all resources |

---

## Monitoring & Troubleshooting

### View Logs
```bash
eb logs --all
```

### Check Environment Health
```bash
eb health --refresh
```

### Common Issues

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check `eb logs` — likely a database connection error |
| Database connection refused | Ensure RDS security group allows inbound from EB instances |
| App crashes on start | Verify `RDS_DB_NAME` env var is set and database exists |

---

## Cleanup (Avoid Ongoing Charges)

To delete all resources created:

```bash
eb terminate task-manager-env --all
```

> ⚠️ This will delete the Elastic Beanstalk environment, EC2 instances, load balancer, **and the RDS database**. Make sure to back up any data first.

---

## Cost Considerations

| Resource | Estimated Cost |
|----------|---------------|
| EC2 (t2.micro) | Free tier eligible |
| RDS (db.t3.micro) | Free tier eligible (750 hrs/month) |
| Load Balancer | ~$16/month |
| Data Transfer | Minimal for dev/test |

> 💡 Use the [AWS Pricing Calculator](https://calculator.aws) for detailed estimates.

---

## Security Best Practices

- Never commit `.env` files or credentials to version control
- Use IAM roles instead of access keys where possible
- Restrict RDS security group to only allow traffic from EB instances
- Enable HTTPS by adding an SSL certificate via AWS Certificate Manager
- Rotate database passwords regularly
