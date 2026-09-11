import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import dotenv from "dotenv";

dotenv.config();

const { CLIENT_ID, GUILD_ID, TOKEN } = process.env;

console.log("Registering commands...");

const commands = [
    new SlashCommandBuilder()
        .setName("séance")
        .setDescription("Créer une nouvelle séance")
        .addStringOption((option) =>
            option
                .setName("salle")
                .setRequired(true)
                .setDescription("Salle de la scéance")
                .addChoices(
                    { name: "Antrebloc", value: "antrebloc" },
                    { name: "Climb-up", value: "climb-up" },
                    { name: "Climb-up (Bordeaux)", value: "climb-up-bordeaux" }
                )
        )
        .addStringOption((option) =>
            option
                .setName("date")
                .setRequired(true)
                .setDescription("Jour de la semaine")
                .addChoices(
                    { name: "Lundi", value: "lundi" },
                    { name: "Mardi", value: "mardi" },
                    { name: "Mercredi", value: "mercredi" },
                    { name: "Jeudi", value: "jeudi" },
                    { name: "Vendredi", value: "vendredi" },
                    { name: "Samedi", value: "samedi" },
                    { name: "Dimanche", value: "dimanche" }
                )
        )
        .addStringOption((option) =>
            option
                .setName("heure")
                .setRequired(true)
                .setDescription("Heure de début")
                .addChoices(
                    { name: "8h", value: "8" },
                    { name: "9h", value: "9" },
                    { name: "10h", value: "10" },
                    { name: "11h", value: "11" },
                    { name: "12h", value: "12" },
                    { name: "13h", value: "13" },
                    { name: "14h", value: "14" },
                    { name: "15h", value: "15" },
                    { name: "16h", value: "16" },
                    { name: "17h", value: "17" },
                    { name: "18h", value: "18" },
                    { name: "19h", value: "19" },
                    { name: "20h", value: "20" },
                    { name: "21h", value: "21" }
                )
        ),
    new SlashCommandBuilder()
        .setName("activité")
        .setDescription("Savoir son nombre de séances")
        .addNumberOption((option) => option.setName("mois").setRequired(true).setDescription("Mois de l'activité").addChoices(
            { name: "Janvier", value: 0 },
            { name: "Février", value: 1 },
            { name: "Mars", value: 2 },
            { name: "Avril", value: 3 },
            { name: "Mai", value: 4 },
            { name: "Juin", value: 5 },
            { name: "Juillet", value: 6 },
            { name: "Août", value: 7 },
            { name: "Septembre", value: 8 },
            { name: "Octobre", value: 9 },
            { name: "Novembre", value: 10 },
            { name: "Décembre", value: 11 }
        )),
    new SlashCommandBuilder()
        .setName("inscription")
        .setDescription("S'inscrire dans la base de donnée")
        .addStringOption((option) => option.setName("nom").setRequired(true).setDescription("Nom de famille"))
        .addStringOption((option) => option.setName("prénom").setRequired(true).setDescription("Prénom"))
        .addStringOption((option) =>
            option
                .setName("promo")
                .setRequired(true)
                .setDescription("Promotion")
                .addChoices({ name: "2026", value: "2026" }, { name: "2027", value: "2027" }, { name: "2028", value: "2028" }, { name: "2029", value: "2029" }, { name: "2030", value: "2030" }, { name: "other", value: "other" })
        ),
    new SlashCommandBuilder().setName("helloasso").setDescription("Retourne votre identifiant HelloAsso"),
    new SlashCommandBuilder()
        .setName("relevé")
        .setDescription("Retourne le relevé des séances pour l'administration")
        .addStringOption(
            (option) =>
                option
                    .setName("depuis")
                    .setDescription("Date de début - format : jj-mm-aaaa")
                    .setRequired(true)
        )
        .addStringOption(
            (option) =>
                option
                    .setName("a")
                    .setDescription("Date de fin - format : jj-mm-aaaa")
                    .setRequired(true)
        )
        .setDefaultMemberPermissions(0),
    new SlashCommandBuilder()
        .setName("issues")
        .setDescription("Retourne les issues d'achats pour l'administration")
        .addBooleanOption((option) =>
            option
                .setName("open_only")
                .setDescription("Afficher seulement les issues ouvertes")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(0),
    new SlashCommandBuilder()
        .setName("status")
        .setDescription("Retourne le statut pour l'administration")
        .setDefaultMemberPermissions(0),
    new SlashCommandBuilder()
        .setName("commande")
        .setDescription("Affiche les détails d'une commande")
        .addStringOption((option) =>
            option.setName("id").setDescription("ID de la commande").setRequired(true)
        )
        .setDefaultMemberPermissions(0),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

console.log("Sending commands...");

rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);
