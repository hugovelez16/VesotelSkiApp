
import os
import smtplib
from email.mime.text import MIMEText

def test_smtp():
    smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("MAIL_PORT", 587))
    smtp_username = os.getenv("MAIL_USERNAME")
    smtp_password = os.getenv("MAIL_PASSWORD")
    
    print(f"Testing SMTP to {smtp_server}:{smtp_port}")
    print(f"User: {smtp_username}")
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.set_debuglevel(1)
        print("Connected")
        
        if smtp_port == 587:
            print("Starting TLS...")
            server.starttls()
            print("TLS Active")
        
        print("Logging in...")
        server.login(smtp_username, smtp_password)
        print("Logged in successfully")
        
        msg = MIMEText("This is a test email from the Vesotel Debug Script.")
        msg['Subject'] = "Vesotel SMTP Debug"
        msg['From'] = smtp_username
        msg['To'] = smtp_username
        
        print(f"Sending email to {smtp_username}...")
        server.send_message(msg)
        print("Email sent successfully!")
        
        server.quit()
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")

if __name__ == "__main__":
    test_smtp()
