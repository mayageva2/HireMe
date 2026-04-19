import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource'; // אם אין לך עדיין תיקיית auth, ניצור אותה מיד
import { data } from './data/resource';
import { storage } from './storage/resource';

defineBackend({
  auth,
  data,
  storage,
});