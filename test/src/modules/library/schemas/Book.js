export default {
  $id: 'Book',
  title: 'Книга',
  type: 'object',
  properties: {
    id: { type: 'number' },
    title: { type: 'string' },
    author: { type: 'string' }
  },
  required: ['id', 'title']
};
