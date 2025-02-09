import { Op } from 'sequelize';
import Contact from '../models/Contact';

export class ContactService {
  async findOrCreatePrimaryContact(email?: string | null, phoneNumber?: string | null) {
    if (!email && !phoneNumber) {
      throw new Error('Either email or phoneNumber must be provided');
    }

    const existingContacts = await this.findExistingContacts(email, phoneNumber);
    
    if (existingContacts.length === 0) {
      return this.createNewPrimaryContact(email, phoneNumber);
    }

    return this.consolidateContacts(existingContacts, email, phoneNumber);
  }

  private async findExistingContacts(email?: string | null, phoneNumber?: string | null) {
    return Contact.findAll({
      where: {
        [Op.or]: [
          ...(email ? [{ email }] : []),
          ...(phoneNumber ? [{ phoneNumber }] : [])
        ]
      },
      order: [['createdAt', 'ASC']]
    });
  }

  private async createNewPrimaryContact(email?: string | null, phoneNumber?: string | null) {
    const newContact = await Contact.create({
      email,
      phoneNumber,
      linkPrecedence: 'primary',
      linkedId: null
    });

    return {
      primaryContactId: newContact.id,
      emails: email ? [email] : [],
      phoneNumbers: phoneNumber ? [phoneNumber] : [],
      secondaryContactIds: []
    };
  }

  private async consolidateContacts(existingContacts: Contact[], email?: string | null, phoneNumber?: string | null) {
    const primaryContact = existingContacts.find(c => c.linkPrecedence === 'primary') || existingContacts[0];
    
    await this.handleNewInformation(primaryContact, existingContacts, email, phoneNumber);
    await this.updateSecondaryContacts(primaryContact, existingContacts);
    
    const allRelatedContacts = await this.getAllRelatedContacts(primaryContact.id);
    
    return {
      primaryContactId: primaryContact.id,
      emails: [...new Set(allRelatedContacts.map(c => c.email).filter(Boolean))],
      phoneNumbers: [...new Set(allRelatedContacts.map(c => c.phoneNumber).filter(Boolean))],
      secondaryContactIds: allRelatedContacts
        .filter(c => c.id !== primaryContact.id)
        .map(c => c.id)
        .sort((a, b) => a - b)
    };
  }

  private async handleNewInformation(
    primaryContact: Contact,
    existingContacts: Contact[],
    email?: string | null,
    phoneNumber?: string | null
  ) {
    const existingEmails = new Set(existingContacts.map(c => c.email).filter(Boolean));
    const existingPhones = new Set(existingContacts.map(c => c.phoneNumber).filter(Boolean));
    
    if ((email && !existingEmails.has(email)) || (phoneNumber && !existingPhones.has(phoneNumber))) {
      await Contact.create({
        email,
        phoneNumber,
        linkedId: primaryContact.id,
        linkPrecedence: 'secondary'
      });
    }
  }

  private async updateSecondaryContacts(primaryContact: Contact, existingContacts: Contact[]) {
    await Contact.update(
      {
        linkPrecedence: 'secondary',
        linkedId: primaryContact.id
      },
      {
        where: {
          [Op.or]: [
            { id: { [Op.in]: existingContacts.map(c => c.id) } },
            { linkedId: { [Op.in]: existingContacts.map(c => c.id) } }
          ],
          id: { [Op.ne]: primaryContact.id }
        }
      }
    );
  }

  private async getAllRelatedContacts(primaryId: number) {
    return Contact.findAll({
      where: {
        [Op.or]: [
          { id: primaryId },
          { linkedId: primaryId }
        ]
      }
    });
  }
}