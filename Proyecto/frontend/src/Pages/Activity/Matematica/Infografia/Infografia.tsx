import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayoutInfografia";
import styles from './Infografia.module.css';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ActivityLayoutInfografia from "../../../../Layouts/ActivityLayout/ActivityLayoutInfografia";


const questions = [
    {
        question: '¿Cuál es el resultado de 2x + 3x?',
        hint: 'Suma los coeficientes de la misma variable.',
        options: [
            'A. 5x',
            'B. 6x',
            'C. 2x^3'
        ]
    },
    {
        question: '¿Cómo se resuelve la ecuación x - 4 = 10?',
        hint: 'Despeja x sumando 4 a ambos lados.',
        options: [
            'A. x = 6',
            'B. x = 14',
            'C. x = -6'
        ]
    },
    {
        question: '¿Cuál es el valor de x en la ecuación 3x = 12?',
        hint: 'Divide ambos lados por 3.',
        options: [
            'A. x = 4',
            'B. x = 9',
            'C. x = 36'
        ]
    },
    {
        question: '¿Qué propiedad se usa en a(b + c) = ab + ac?',
        hint: 'Permite multiplicar un número por una suma.',
        options: [
            'A. Propiedad distributiva',
            'B. Propiedad conmutativa',
            'C. Propiedad asociativa'
        ]
    }
];

const Infografia = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const q = questions[page];
    return (
    <ActivityLayoutInfografia title="Infografía de Matemáticas">
            <div className={styles.flexRow}>
                <div className={styles.panelAzul1}>
                    <div className={styles.panelTopControls}>
                        <button
                            className={styles.backButton}
                            onClick={() => navigate('/subjects/matematicas')}
                            aria-label="Volver a Historia"
                        >
                            <span className={styles.arrow}>&larr;</span>
                        </button>
                        <div className={styles.zoomControls}>
                            <button className={styles.zoomBtn} aria-label="Zoom in">+</button>
                            <button className={styles.zoomBtn} aria-label="Zoom out">-</button>
                        </div>
                    </div>
                    <div className={styles.infografiaContainer}>
                        {/* Aquí irá la imagen de la infografía */}
                        <img
                            src=""
                            alt=""
                            className={styles.infografiaImg}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div className={styles.activityTitle}>Algebra Basica</div>
                    <div className={styles.panelAzul2}>

                        <div className={styles.question}>{q.question}</div>
                        <br />
                        <span className={styles.hint}>{q.hint}</span>
                        <div className={styles.containeroptions}>
                            <button className={styles.option1 + (selected === 0 ? ' ' + styles.selected : '')} onClick={() => setSelected(0)}>
                                <span className={styles.optionLetter + ' ' + styles.letterA}>A</span>
                                {q.options[0].replace(/^A\.?\s*/, "")}
                            </button>
                            <button className={styles.option2 + (selected === 1 ? ' ' + styles.selected : '')} onClick={() => setSelected(1)}>
                                <span className={styles.optionLetter + ' ' + styles.letterB}>B</span>
                                {q.options[1].replace(/^B\.?\s*/, "")}
                            </button>
                            <button className={styles.option3 + (selected === 2 ? ' ' + styles.selected : '')} onClick={() => setSelected(2)}>
                                <span className={styles.optionLetter + ' ' + styles.letterC}>C</span>
                                {q.options[2].replace(/^C\.?\s*/, "")}
                            </button>
                        </div>
                        <div className={styles.paginationContainer}>
                            <button
                                className={styles.paginationBtn}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >Anterior</button>
                            <span className={styles.paginationInfo}>Página {page + 1} de {questions.length}</span>
                            <button
                                className={styles.paginationBtn}
                                onClick={() => setPage((p) => Math.min(questions.length - 1, p + 1))}
                                disabled={page === questions.length - 1}
                            >Siguiente</button>
                            <span className={styles.progressIndicator}>
                                {questions.map((_, i) => (
                                    <span
                                        key={i}
                                        className={
                                            styles.progressDot + (i === page ? ' ' + styles.active : '')
                                        }
                                    ></span>
                                ))}
                            </span>
                            <button className={styles.finishedBtn}>
                                Finished
                                <span className={styles.coinIcon}>🪙</span>
                                <span className={styles.coinValue}>+5</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ActivityLayoutInfografia>
    );
};

export default Infografia;

