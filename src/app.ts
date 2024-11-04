import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { db } from 'firebase.config'
import dotenv from 'dotenv'
import puppeteer from 'puppeteer';
import fsPromises from "node:fs/promises";
import { months } from 'date'
import { enviarTareaEstudiante, hacerOtraConsulta, tareasEstudiantesFlow } from './flows/flowTareas'
import { cuadernoControlFlow, enviarCuadernoControl } from './flows/flowCuadernoControl'
dotenv.config()
const PORT = process.env.PORT ?? 3008
// const PORT = 3000

const discordFlow = addKeyword<Provider, Database>('doc').addAnswer(
    ['You can see the documentation here', '📄 https://builderbot.app/docs \n', 'Do you want to continue? *yes*'].join(
        '\n'
    ),
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic }) => {
        if (ctx.body.toLocaleLowerCase().includes('yes')) {
            return gotoFlow(registerFlow)
        }
        await flowDynamic('Thanks!')
        return
    }
)

const welcomeFlow = addKeyword<Provider, Database>(['hi', 'hello', 'hola'])
    .addAnswer(`🙌 Hello welcome to this *Chatbot*`)
    .addAnswer(
        [
            'I share with you the following links of interest about the project',
            '👉 *doc* to view the documentation',
        ].join('\n'),
        { delay: 800, capture: true },
        async (ctx, { fallBack }) => {
            if (!ctx.body.toLocaleLowerCase().includes('doc')) {
                return fallBack('You should type *doc*')
            }
            return
        },
        [discordFlow]
    )

const registerFlow = addKeyword<Provider, Database>(utils.setEvent('REGISTER_FLOW'))
    .addAnswer(`What is your name?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body })
    })
    .addAnswer('What is your age?', { capture: true }, async (ctx, { state }) => {
        await state.update({ age: ctx.body })
    })
    .addAction(async (_, { flowDynamic, state }) => {
        await flowDynamic(`${state.get('name')}, thanks for your information!: Your age: ${state.get('age')}`)
    })

const fullSamplesFlow = addKeyword<Provider, Database>(['samples', utils.setEvent('SAMPLES')])
    .addAnswer(`💪 I'll send you a lot files...`)
    .addAnswer(`Send image from Local`, { media: join(process.cwd(), 'assets', 'sample.png') })
    .addAnswer(`Send video from URL`, {
        media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4',
    })
    .addAnswer(`Send audio from URL`, { media: 'https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3' })
    .addAnswer(`Send file from URL`, {
        media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    })


/// apartir de aqui vciene el codigo para el chatbot divi

const enviarAsistenciaFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
    .addAnswer('Se ha generado el reporte de asistencia exitosamente. ', null, async (_, { state, flowDynamic, gotoFlow }) => {
        console.log('segundo')
        await flowDynamic([{
            body: `Look at this`,
            media: join(`${state.get('dniUsuario')}-asistencia-${state.get('mes')}.pdf`)
            // media: join(`cpp.xlsx`) //estoy probando si se puede enviar archivos excel, word y power point
        }])
        // if(state.get('dniUsuario').length === 8){
        // console.log(`archivo ha sido borrado`, 'state.get(dniUsuario)', state.get('dniUsuario'));
        await fsPromises.unlink(`${state.get('dniUsuario')}-asistencia-${state.get('mes')}.pdf`);
        return gotoFlow(hacerOtraConsulta)
        // }
    })

const asistenciaEstudianteFlow = addKeyword(['1', 'asistencia', 'asistencias'])
    // .addAnswer('Estamos validando la informacion de tu asistencia, espera un momento porfavor')
    .addAnswer(['De que mes quieres la asistencia?, escribe el mes porfavor.'], { capture: true }, async (ctx, { state, flowDynamic, fallBack, gotoFlow }) => {
        await flowDynamic('Espera un momento estamos generando tu record de asistencia.')
        const dni = state.get('dniUsuario')
        const mes = ctx.body.toLowerCase()
        if (months.includes(mes)) {
            await state.update({ mes: mes })
            const browser = await puppeteer.launch({
                // headless: true,
                args: [
                    "--disabled-setuid-sandbox",
                    "--no-sandbox",
                    // "--single-process",
                    // "--no-zygote"
                ],
                executablePath: "/usr/bin/chromium-browser", //solo para produccion se quita el comentario
            })
            const page = await browser.newPage()
            await page.goto(`${process.env.PRIVATE_URL}/estudiantes/resumen-consulta?mes=${mes}&dni=${dni}&id=${process.env.ID_INSTITUTION}`, {
                waitUntil: 'networkidle2',
            })
            // await page.waitforTimeout(5000);
            setTimeout(async () => {
                await page.setViewport({ width: 1366, height: 768 });
                const bodyHandle = await page.$('body');
                const { height } = await bodyHandle.boundingBox();
                await bodyHandle.dispose();
                const calculatedVh = page.viewport().height;
                let vhIncrease = 0;
                while (vhIncrease + calculatedVh < height) {
                    // Here we pass the calculated viewport height to the context
                    // of the page and we scroll by that amount
                    await page.evaluate(_calculatedVh => {
                        window.scrollBy(0, _calculatedVh);
                    }, calculatedVh);
                    // await page.waitForNetworkIdle();
                    vhIncrease = vhIncrease + calculatedVh;
                }
                // Setting the viewport to the full height might reveal extra elements
                await page.setViewport({ width: 1366, height: calculatedVh });

                // Scroll back to the top of the page by using evaluate again.
                await page.evaluate(() => {
                    window.scrollTo(0, 0);
                });
                await page.pdf({
                    path: `${state.get('dniUsuario')}-asistencia-${mes}.pdf`,
                    format: 'a4',
                    margin: { top: '10mm', bottom: '10mm' }
                });
                await browser.close()
                    .then(r => {
                        console.log('primero')
                        return gotoFlow(enviarAsistenciaFlow)
                    })
            }, 3000)

        } else {
            await flowDynamic('Porfavor escribe un mes valido')
            return fallBack()
        }
    })


const asistenciaEmployeeFlow = addKeyword(['1', 'asistencia', 'asistencias'])
    // .addAnswer('Estamos validando la informacion de tu asistencia, espera un momento porfavor')
    .addAnswer(['De que mes quieres la asistencia?, escribe el mes porfavor.'], { capture: true }, async (ctx, { state, flowDynamic, fallBack, gotoFlow }) => {
        await flowDynamic('Espera un momento estamos generando tu record de asistencia.')
        const dni = state.get('dniUsuario')
        const mes = ctx.body.toLowerCase()
        if (months.includes(mes)) {
            await state.update({ mes: mes })
            const browser = await puppeteer.launch({
                // headless: true,
                args: [
                    "--disabled-setuid-sandbox",
                    "--no-sandbox",
                    // "--single-process",
                    // "--no-zygote"
                ],
                executablePath: "/usr/bin/chromium-browser", //solo para produccion se quita el comentario
            })
            const page = await browser.newPage()
            await page.goto(`${process.env.PRIVATE_URL}/empleados/resumen-consulta?mes=${mes}&dni=${dni}&id=${process.env.ID_INSTITUTION}`, {
                waitUntil: 'networkidle2',
            })
            // await page.waitforTimeout(5000);
            setTimeout(async () => {
                await page.setViewport({ width: 1366, height: 768 });
                const bodyHandle = await page.$('body');
                const { height } = await bodyHandle.boundingBox();
                await bodyHandle.dispose();
                const calculatedVh = page.viewport().height;
                let vhIncrease = 0;
                while (vhIncrease + calculatedVh < height) {
                    // Here we pass the calculated viewport height to the context
                    // of the page and we scroll by that amount
                    await page.evaluate(_calculatedVh => {
                        window.scrollBy(0, _calculatedVh);
                    }, calculatedVh);
                    // await page.waitForNetworkIdle();
                    vhIncrease = vhIncrease + calculatedVh;
                }
                // Setting the viewport to the full height might reveal extra elements
                await page.setViewport({ width: 1366, height: calculatedVh });

                // Scroll back to the top of the page by using evaluate again.
                await page.evaluate(() => {
                    window.scrollTo(0, 0);
                });
                await page.pdf({
                    path: `${state.get('dniUsuario')}-asistencia-${mes}.pdf`,
                    format: 'a4',
                    margin: { top: '10mm', bottom: '10mm' }
                });
                await browser.close()
                    .then(r => {
                        console.log('primero')
                        return gotoFlow(enviarAsistenciaFlow)
                    })
            }, 3000)

        } else {
            await flowDynamic('Porfavor escribe un mes valido')
            return fallBack()
        }
    })

export const opcionesEstudianteFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
    .addAnswer(['Estas son las opciones que tenemos para ti. Selecciona una opción, escribiendo un número.', '*1-* Asistencia', '*2-* Tareas', '*3-* Cuaderno de control', '*4-* Terminar'], { capture: true }, async (ctx, { fallBack, flowDynamic, endFlow }) => {
        const rtaCtx = ctx.body
        if (Number(rtaCtx) !== 1 && Number(rtaCtx) !== 2 && Number(rtaCtx) !== 3 && Number(rtaCtx) !== 4) {
            await flowDynamic('*Porfavor escribe una opción valida*')
            return fallBack()
        }
        if(Number(rtaCtx) === 4) {
            return endFlow('Que tengas buena dia, escribeme si tienes mas consultas.')
        }
    }, [asistenciaEstudianteFlow, tareasEstudiantesFlow, cuadernoControlFlow])

const opcionesEmployeesFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
    .addAnswer(['Estas son las opciones que tenemos para ti. Selecciona una opción, escribiendo un número.', '*1-* Asistencia'], { capture: true }, async (ctx, { fallBack, flowDynamic }) => {
        const rtaCtx = ctx.body
        if (rtaCtx !== "1") {
            await flowDynamic('Porfavor escribe una opción valida')
            return fallBack()
        }
    }, [asistenciaEmployeeFlow])

const validacionDniFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
    .addAnswer([`Cual es tu *ID* o numero de *DNI*?`], { capture: true }, async (ctx, { gotoFlow, fallBack, flowDynamic, state, endFlow }) => {
        const dni: string = ctx.body
        const regex = /^[0-9]*$/;
        const onlyNumbers = regex.test(dni)
        if (ctx.body === 'cancelar') {
            return endFlow('Haz cancelado la operación');
        }
        if (dni.length === 8 && onlyNumbers) {
            await state.update({ dniUsuario: dni })
            //el path no es dinamico ya que este chatbot sera unico para el colegio, en este caso divino maestro
            const studentRef = db.collection("/intituciones/l2MjRJSZU2K6Qdyc3lUz/students").doc(`${dni}`);
            studentRef.get().then(async (doc) => {
                if (doc.exists) {
                    await state.update({ name: doc.data().name.toUpperCase(), lastname: doc.data().lastname.toUpperCase(), firstname: doc.data().firstname.toUpperCase(), grade: doc.data().grade })
                    await flowDynamic(`Hola *${doc.data().name.toUpperCase()} ${doc.data().lastname.toUpperCase()} ${doc.data().firstname.toUpperCase()}*.`)
                    return gotoFlow(opcionesEstudianteFlow)
                } else {
                    const employeeRef = db.collection("/intituciones/l2MjRJSZU2K6Qdyc3lUz/employee").doc(`${dni}`);
                    employeeRef.get().then(async (doc) => {
                        if (doc.exists) {
                            await flowDynamic(`Hola *${doc.data().name.toUpperCase()} ${doc.data().lastname.toUpperCase()} ${doc.data().firstname.toUpperCase()}*.`)
                            return gotoFlow(opcionesEmployeesFlow)
                        } else {
                            await flowDynamic('No se encontro resultados, escribe un *DNI* valido')
                            return fallBack()
                        }
                    })
                }
            }).catch((error) => {
                console.log("Error getting document:", error);
            });
        } else {
            await flowDynamic('Escribe un *DNI* valido')
            return fallBack()
        }


    })
const bienvenidaFlow = addKeyword<Provider, Database>(EVENTS.WELCOME)
    .addAnswer(`Hola soy Divi, tu asistente virtual, bienvenido al chat de consultas del *DIVINO MAESTRO*`, null, async (ctx, { gotoFlow }) => {
        return gotoFlow(validacionDniFlow)
    })

const main = async () => {
    // const adapterFlow = createFlow([welcomeFlow, registerFlow, fullSamplesFlow])
    const adapterFlow = createFlow([bienvenidaFlow, opcionesEstudianteFlow, enviarAsistenciaFlow, validacionDniFlow, opcionesEmployeesFlow,enviarTareaEstudiante, enviarCuadernoControl, hacerOtraConsulta])

    const adapterProvider = createProvider(Provider) as any
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
