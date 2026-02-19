import Fastify from 'fastify';
import categoriesRoutes from './routes/categories.js';
import specialitiesRoutes from './routes/specialities.js';
import teamMembersRoutes from './routes/team-members.js';
import ticketsRoutes from './routes/tickets.js';
import assignmentRoutes from './routes/assignment.js';

const app = Fastify({ logger: true });

app.register(categoriesRoutes);
app.register(specialitiesRoutes);
app.register(teamMembersRoutes);
app.register(ticketsRoutes);
app.register(assignmentRoutes);

const port = Number(process.env.PORT) || 3000;
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
