const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');
const User = require('../models/user');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    const newUser = await User.create({ 
      email, 
      password: hashedPassword,
      verificationToken,
     });

     const verificationLink = `http://localhost:3000/users/verify/${verificationToken}`;
     const msg = {
      to: email,
      from: 'frasunkiewicz.dorota@gmail.com', 
      subject: 'Verify your email',
      text: `Please verify your email by clicking on the following link: ${verificationLink}`,
      html: `<a href="${verificationLink}">Verify your email</a>`,
    };

    await sgMail.send(msg);

    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
      },
      message: 'User registered. Verification email sent.',
    });
  } catch (err) {
    next(err);
  }
};
const verifyEmail = async (req, res, next) => {
  try {
    const { verificationToken } = req.params;

    const user = await User.findOne({ verificationToken });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.verificationToken = null;
    user.verify = true;
    await user.save();

    res.status(200).json({ message: 'Verification successful' });
  } catch (err) {
    next(err);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Missing required field email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verify) {
      return res.status(400).json({ message: 'Verification has already been passed' });
    }

    const verificationLink = `http://localhost:3000/users/verify/${user.verificationToken}`;

    const msg = {
      to: email,
      from: 'your-email@example.com', // Replace with your verified email
      subject: 'Verify your email',
      text: `Please verify your email by clicking on the following link: ${verificationLink}`,
      html: `<a href="${verificationLink}">Verify your email</a>`,
    };

    await sgMail.send(msg);

    res.status(200).json({ message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.verify) {
      return res.status(401).json({ message: 'Email not verified or does not exist' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Email or password is wrong' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    user.token = token;
    await user.save();

    res.status(200).json({ token, user: { email: user.email, subscription: user.subscription } });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const user = req.user;
    user.token = null;
    await user.save();
    res.status(204).json();
  } catch (err) {
    next(err);
  }
};

const currentUser = (req, res) => {
  res.status(200).json({
    email: req.user.email,
    subscription: req.user.subscription,
  });
};

module.exports = { 
  signup, 
  login, 
  logout, 
  currentUser, 
  verifyEmail,
  resendVerificationEmail, 
};
