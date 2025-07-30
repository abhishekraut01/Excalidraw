import express, { Router } from 'express';
import {
  getUser,
  userLogin,
  userLogout,
  userSignUp,
} from '../controllers/auth.controller';

import authMiddleware from '../middleware/auth.middleware';

const router: Router = express.Router();

router.route('/signup').post(userSignUp);
router.route('/login').post(userLogin);
router.route('/logout').post(authMiddleware, userLogout);
router.route('/getuser').get(authMiddleware, getUser);


export default router;