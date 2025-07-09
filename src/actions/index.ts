import { galleries } from "./galleries.js";
import { photos } from "./photos.js";
import { createInvitation, validateInvitation, useInvitation, listInvitations, deleteInvitation, checkRegistrationPermission } from "./invitations.js";
import { isCurrentUserAdmin, deleteUser, listUsers } from "./users.js";
import { settings } from "./settings.js";
import { apiKeys } from "./apiKeys.js";
import { storage } from "./storage.js";

export const server = {
  galleries,
  photos,
  invitations: {
    create: createInvitation,
    validate: validateInvitation,
    use: useInvitation,
    list: listInvitations,
    delete: deleteInvitation,
    checkRegistrationPermission: checkRegistrationPermission,
  },
  users: {
    isCurrentUserAdmin,
    delete: deleteUser,
    list: listUsers,
  },
  settings,
  apiKeys,
  storage,
};
