import app from '../../../server/app';

// Express owns request parsing and route dispatch for all /api/* endpoints.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  return app(req, res);
}
