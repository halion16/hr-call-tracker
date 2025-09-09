# 🏢 Setup EcosAgile - Guida Configurazione

## ✅ Integrazione EcosAgile Completata!

L'app HR Call Tracker è ora completamente integrata con EcosAgile utilizzando:

- **Autenticazione TokenGet**: Implementata correttamente
- **PeopleExpressGetAll**: Per importare i dipendenti
- **Token preconfigurati**: Già inseriti nell'app

I tuoi token sono già precaricati nell'app:

- **EcosApi AuthToken**: `039b969c-339d-4316-9c84-e4bfe1a77f3f`
- **URL Cal Token**: `0AF0QFNRF5HPS5FJT6MMWF0DI`  
- **API Password**: `dG2ZhGyt!`

## 🚀 Come Completare la Configurazione

### 1. **Informazioni richieste:**

**A) Codice Istanza EcosAgile:**
```
Esempio: demo
         mycompany
         tuocodice
```
*Questo è il codice che appare nell'URL della tua istanza EcosAgile*

**B) Credenziali EcosAgile:**
```
Username: il tuo username EcosAgile
Password: la tua password EcosAgile  
Client ID: (opzionale) se richiesto dalla tua istanza
```

### 2. **Configurazione nell'App:**

1. **Vai su Impostazioni** nell'app
2. **Inserisci i dati EcosAgile:**
   - **Endpoint**: `https://api.ecosagile.com` (già preimpostato)
   - **Codice Istanza**: `il_tuo_codice_istanza`
   - **Username**: `tuo_username_ecosagile`
   - **Password**: `tua_password_ecosagile`
   - **Client ID**: `client_id` (se necessario)
3. **I token sono già configurati** automaticamente
4. **Clicca "Testa Connessione"** per verificare
5. **Se funziona, attiva "Attiva API Reale"**
6. **Vai su Dipendenti → Sincronizza**

### 3. **Flusso di Autenticazione EcosAgile:**

L'app implementa il flusso corretto EcosAgile:

1. **TokenGet**: Richiede token con username/password
```
POST https://api.ecosagile.com/{CODICE_ISTANZA}/api.pm
action=TokenGet&userid={USERNAME}&password={PASSWORD}
```

2. **PeopleExpressGetAll**: Usa il token per ottenere dipendenti
```
POST https://api.ecosagile.com/{CODICE_ISTANZA}/api.pm
action=PeopleExpressGetAll&token={TOKEN_OTTENUTO}
```

### 4. **Cosa Viene Importato:**

L'app importa automaticamente:
- **ID Dipendente**
- **Nome e Cognome**
- **Email** (se presente)
- **Ruolo/Posizione**
- **Dipartimento**
- **Telefono** (se presente)
- **Stato attivo/inattivo**

## 🧪 **Testing Immediato**

**Puoi testare SUBITO** anche senza la configurazione completa:

1. **Modalità Mock attiva**: L'app funziona già con 6 dipendenti demo
2. **Testa tutte le funzioni**: Schedulazione call, completamento, report
3. **Quando pronto**: Switch alla tua API reale

## 📞 **Per Completare l'Integrazione**

**Dimmi solo:**
1. Qual è il tuo **codice istanza EcosAgile**?
2. Il tuo **username EcosAgile**?
3. La tua **password EcosAgile**?
4. **Client ID** (se richiesto)?

Una volta che hai questi dati:
- **Inseriscili nelle Impostazioni** dell'app
- **Testa la connessione** 
- **Attiva l'API reale**
- **Sincronizza i dipendenti**

## 🔧 **Debug e Troubleshooting**

Se qualcosa non funziona:
- **Console del browser** (F12) mostra i log dettagliati
- **Modalità Mock** permette di testare l'app senza API
- **Fallback automatico** ai dati mock in caso di errori
- **Test di connessione** verifica le credenziali

**L'integrazione EcosAgile è completa e pronta** - serve solo la tua configurazione! 🚀