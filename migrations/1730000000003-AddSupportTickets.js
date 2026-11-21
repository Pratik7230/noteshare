/** Support tickets: users open a ticket, then they and admins reply in a thread. */
export class AddSupportTickets1730000000003 {
  name = "AddSupportTickets1730000000003";

  async up(q) {
    await q.query(`
      CREATE TABLE support_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        number serial UNIQUE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject varchar(150) NOT NULL,
        category varchar(16) NOT NULL CHECK (category IN ('account','bug','feature','abuse','other')),
        status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','closed')),
        priority varchar(16) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
        last_message_at timestamptz NOT NULL DEFAULT now(),
        closed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_support_tickets_user ON support_tickets (user_id, last_message_at DESC)`);
    await q.query(`CREATE INDEX idx_support_tickets_status ON support_tickets (status, last_message_at DESC)`);

    await q.query(`
      CREATE TABLE ticket_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        author_id uuid REFERENCES users(id) ON DELETE SET NULL,
        is_staff boolean NOT NULL DEFAULT false,
        body varchar(5000) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_ticket_messages_ticket ON ticket_messages (ticket_id, created_at)`);
  }

  async down(q) {
    await q.query(`DROP TABLE ticket_messages`);
    await q.query(`DROP TABLE support_tickets`);
  }
}
