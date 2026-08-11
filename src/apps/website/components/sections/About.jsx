import { aboutValues } from "../content/siteContent.js";

export function About() {
  return (
    <section id="about" className="section section-light">
      <div className="container">
        <div className="row g-5 align-items-start">
          <div className="col-lg-5 fade-up">
            <p className="eyebrow">A little about me</p>
            <h2 className="section-heading">
              Built from curiosity. Driven by purpose.
            </h2>
          </div>
          <div className="col-lg-7 fade-up">
            <div className="about-copy">
              <p className="about-lead">
                Hi, I’m Lachlan — a full-stack developer and the person behind
                Nielsen Innovations.
              </p>
              <p>
                I turn early ideas into practical digital products, combining
                technical problem-solving with a strong focus on the people who
                use them.
              </p>
              <p>
                I’m studying Information Technology at QUT, majoring in
                Artificial Intelligence and Software Development, while building
                products and client systems.
              </p>
            </div>

            <div className="about-details">
              {aboutValues.map((value, index) => (
                <div className="detail-item" key={value.title}>
                  <span className="detail-number">0{index + 1}</span>
                  <div>
                    <h3>{value.title}</h3>
                    <p>{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
