import { getDb } from "../lib/db.js";
import { User } from "../entities/index.js";

const repo = async () => (await getDb()).getRepository(User);

export const userRepository = {
  async findById(id) { return (await repo()).findOne({ where: { id } }); },
  async findByEmail(email) { return (await repo()).findOne({ where: { email } }); },
  async findByEmailWithPassword(email) {
    return (await repo()).createQueryBuilder("u").addSelect("u.password").where("u.email = :email", { email }).getOne();
  },
  async findByVerifyHash(hash) {
    return (await repo()).createQueryBuilder("u").addSelect("u.emailVerifyTokenHash").where("u.emailVerifyTokenHash = :hash", { hash }).getOne();
  },
  async findByResetHash(hash) {
    return (await repo())
      .createQueryBuilder("u").addSelect(["u.resetTokenHash", "u.resetTokenExpiresAt"])
      .where("u.resetTokenHash = :hash", { hash }).getOne();
  },
  async create(data) { const r = await repo(); return r.save(r.create(data)); },
  async update(id, patch) { return (await repo()).update({ id }, patch); },
};
