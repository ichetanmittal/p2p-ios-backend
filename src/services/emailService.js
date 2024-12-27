const nodemailer = require('nodemailer');

// Create transporter based on environment
const createTransporter = async () => {
    console.log('📧 Creating email transporter...');
    console.log('Environment:', process.env.NODE_ENV);
    
    if (process.env.NODE_ENV === 'production') {
        console.log('📧 Using Gmail configuration');
        console.log('Gmail User:', process.env.GMAIL_USER);
        
        // Production configuration using Gmail
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });
    } else {
        console.log('📧 Using Ethereal (test) configuration');
        // Development configuration using Ethereal
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    }
};

const sendVerificationEmail = async (to, verificationCode) => {
    try {
        const transporter = await createTransporter();

        const mailOptions = {
            from: process.env.NODE_ENV === 'production' 
                ? `"P2P App" <${process.env.GMAIL_USER}>`
                : '"P2P App" <noreply@p2p.com>',
            to,
            subject: 'Verify your email address',
            html: `
                <h1>Welcome to P2P!</h1>
                <p>Your verification code is: <strong>${verificationCode}</strong></p>
                <p>This code will expire in 10 minutes.</p>
            `
        };

        console.log('📧 Sending email to:', to);
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent successfully');
        console.log('📧 Message ID:', info.messageId);

        if (process.env.NODE_ENV !== 'production') {
            console.log('📨 Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
};

module.exports = {
    sendVerificationEmail
};
