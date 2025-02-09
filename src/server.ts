// src/server.ts
import express from 'express';
import sequelize from './config/database';  // Add this import
import { ContactController } from './controllers/contactController';

const app = express();
const router = express.Router();
app.use(express.json());

const contactController = new ContactController();
router.post('/identify', (req, res) => contactController.identify(req, res));

app.use('/api', router);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.sync();
    console.log('Database synchronized');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();