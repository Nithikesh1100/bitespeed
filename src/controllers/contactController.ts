import { Request, Response } from 'express';
import { ContactService } from '../services/contactService';

export class ContactController {
  private contactService: ContactService;

  constructor() {
    this.contactService = new ContactService();
  }

  async identify(req: Request, res: Response) {
    try {
      const { email, phoneNumber } = req.body;
      const contact = await this.contactService.findOrCreatePrimaryContact(email, phoneNumber);
      res.json({ contact });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Internal server error');
      res.status(500).json({
        contact: {
          primaryContactId: 0,
          emails: [],
          phoneNumbers: [],
          secondaryContactIds: []
        }
      });
    }
  }
}